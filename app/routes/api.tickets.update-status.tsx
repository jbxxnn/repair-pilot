import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { createPosOrder, sendDraftOrderInvoice } from "../services/shopify.server";
import { sendStatusUpdateEmail } from "../services/email.server";
import { TICKET_STATUSES, isValidTicketStatus } from "../utils/ticket-status";
import { calculateRemainingAmount, formatCurrency } from "../utils/currency";

export interface UpdateTicketStatusRequest {
  ticketId: string;
  status: string;
  technicianId?: string;
  notes?: string;
}

export interface UpdateTicketStatusResponse {
  success: boolean;
  ticketId?: string;
  finalOrderId?: string;
  error?: string;
}

export const loader = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
};

export const action = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  try {
    const { session } = await authenticate.admin(request);

    if (!session) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json() as UpdateTicketStatusRequest;

    // Validate required fields
    if (!body.ticketId) {
      return new Response(JSON.stringify({
        success: false,
        error: "Ticket ID is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate status if provided
    if (body.status && !isValidTicketStatus(body.status)) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid ticket status"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get the ticket with parts included
    const ticket = await prisma.ticket.findUnique({
      where: { id: body.ticketId },
      include: {
        partsUsed: true,
      }
    });

    if (!ticket) {
      return new Response(JSON.stringify({
        success: false,
        error: "Ticket not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Build update data
    const updateData: any = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.technicianId !== undefined) {
      updateData.technicianId = body.technicianId || null;
    }

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: body.ticketId },
      data: updateData,
    });

    // Track if status changed for email notification
    const statusChanged = body.status !== undefined && body.status !== ticket.status;
    const oldStatus = ticket.status;
    const newStatus = body.status !== undefined ? body.status : ticket.status;

    // Create audit log entry
    const logAction = statusChanged ? "status_updated" : 
                      body.technicianId !== undefined ? "technician_updated" : "ticket_updated";
    
    await prisma.auditLog.create({
      data: {
        ticketId: ticket.id,
        actor: "system",
        action: logAction,
        meta: {
          oldStatus: oldStatus,
          newStatus: newStatus,
          oldTechnicianId: ticket.technicianId,
          newTechnicianId: body.technicianId !== undefined ? (body.technicianId || null) : ticket.technicianId,
          notes: body.notes,
        }
      }
    });

    // Send email notification if status changed
    if (statusChanged) {
      try {
        await sendStatusUpdateEmail(request, {
          id: ticket.id,
          status: newStatus,
          deviceType: ticket.deviceType,
          deviceBrand: ticket.deviceBrand,
          deviceModel: ticket.deviceModel,
          quotedAmount: ticket.quotedAmount ? ticket.quotedAmount.toNumber() : null,
          depositAmount: ticket.depositAmount.toNumber(),
          remainingAmount: ticket.remainingAmount.toNumber(),
          customerId: ticket.customerId,
        }, oldStatus, newStatus);
      } catch (error) {
        console.error("Failed to send status update email:", error);
        // Don't fail the status update if email fails
      }
    }

    let finalOrderId: string | undefined;

    // If status changed to "ready" and there's a remaining amount, create final draft order
    if (body.status === TICKET_STATUSES.READY && updatedTicket.status === TICKET_STATUSES.READY && ticket.status !== TICKET_STATUSES.READY) {
      // Recalculate remaining amount to ensure it includes all parts costs
      const partsTotal = ticket.partsUsed.reduce(
        (sum, part) => sum + part.cost.toNumber() * part.quantity,
        0
      );
      const quotedAmount = ticket.quotedAmount ? ticket.quotedAmount.toNumber() : 0;
      const totalAmount = quotedAmount + partsTotal;
      const depositAmount = ticket.depositAmount.toNumber();
      const calculatedRemainingAmount = Math.max(0, totalAmount - depositAmount);

      // Update ticket remaining amount if it's different (shouldn't be, but just in case)
      if (calculatedRemainingAmount !== ticket.remainingAmount.toNumber()) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { remainingAmount: calculatedRemainingAmount }
        });
      }

      // Create final draft order if there's a remaining balance and no final order exists yet
      // Note: If parts are added after order creation, the order amount won't update automatically
      // The order would need to be manually updated or a new order created
      if (calculatedRemainingAmount > 0 && !ticket.finalOrderId) {
        try {
          // Build detailed note with breakdown
          const noteParts = [
            `Repair ticket final payment. Ticket ID: ${ticket.id}`,
          ];

          if (quotedAmount > 0) {
            noteParts.push(`Quoted Amount: ${formatCurrency(quotedAmount)}`);
          }

          if (partsTotal > 0) {
            noteParts.push(`Parts Cost: ${formatCurrency(partsTotal)}`);
            // List individual parts
            ticket.partsUsed.forEach((part, index) => {
              const partTotal = part.cost.toNumber() * part.quantity;
              const partName = part.name || part.sku || `Part ${index + 1}`;
              noteParts.push(`  - ${partName}: ${part.quantity} × ${formatCurrency(part.cost.toNumber())} = ${formatCurrency(partTotal)}`);
            });
          }

          if (depositAmount > 0) {
            noteParts.push(`Deposit Paid: ${formatCurrency(depositAmount)}`);
          }

          noteParts.push(`Total Balance Due: ${formatCurrency(calculatedRemainingAmount)}`);

          const draftOrder = await createPosOrder(request, {
            customerId: ticket.customerId,
            lineItems: [{
              title: `Repair Balance - Ticket #${ticket.id.slice(-8)}`,
              quantity: 1,
              price: calculatedRemainingAmount.toString(),
            }],
            note: noteParts.join('\n'),
          });

          finalOrderId = draftOrder.id;
          console.log("Created final draft order:", finalOrderId);
          console.log("Remaining amount includes parts:", partsTotal > 0 ? `Yes (${formatCurrency(partsTotal)})` : "No");

          // Update ticket with final order ID
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { finalOrderId: finalOrderId }
          });

          // Send draft order invoice to customer
          try {
            const invoiceResult = await sendDraftOrderInvoice(request, finalOrderId);
            if (invoiceResult.success) {
              console.log(`Invoice sent successfully for final order: ${finalOrderId}`);
            } else {
              console.error(`Failed to send invoice: ${invoiceResult.error}`);
            }
          } catch (error) {
            console.error("Error sending final order invoice:", error);
            // Don't fail the order creation if invoice sending fails
          }

          // Create audit log for final order creation
          await prisma.auditLog.create({
            data: {
              ticketId: ticket.id,
              actor: "system",
              action: "final_order_created",
              meta: {
                finalOrderId: finalOrderId,
                remainingAmount: calculatedRemainingAmount,
                quotedAmount: quotedAmount,
                partsTotal: partsTotal,
                partsCount: ticket.partsUsed.length,
                depositAmount: depositAmount,
              }
            }
          });

        } catch (error) {
          console.error("Failed to create final POS order:", error);
          // Continue without order - status is still updated
        }
      }
    }

    // If status changed to "closed", zero out remaining amount
    if (body.status === TICKET_STATUSES.CLOSED) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { remainingAmount: 0 }
      });

      // Create audit log for ticket closure
      await prisma.auditLog.create({
        data: {
          ticketId: ticket.id,
          actor: "system",
          action: "ticket_closed",
          meta: {
            finalOrderId: ticket.finalOrderId,
            remainingAmount: ticket.remainingAmount,
          }
        }
      });
    }

    // Return success response
    const response: UpdateTicketStatusResponse = {
      success: true,
      ticketId: ticket.id,
      finalOrderId: finalOrderId,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (error) {
    console.error("Error updating ticket status:", error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });
  }
};
