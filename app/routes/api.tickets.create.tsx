import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { searchCustomers, createCustomer, createPosOrder, sendDraftOrderInvoice } from "../services/shopify.server";
import { TICKET_STATUSES } from "../utils/ticket-status";
import { formatCurrency, calculateRemainingAmount, isValidAmount } from "../utils/currency";

export interface CreateTicketRequest {
  // Customer data
  customerSearch?: string;
  customerId?: string;
  createNewCustomer?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  
  // Device data
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  serial?: string;
  issueDescription?: string;
  
  // Financial data
  quotedAmount?: number;
  depositAmount: number;
  
  // Optional
  technicianId?: string;
  
  // Photos (array of photo URLs)
  photos?: string[];

  // Payment handling
  paymentMode?: 'pos' | 'invoice';
}

export interface CreateTicketResponse {
  success: boolean;
  ticketId?: string;
  draftOrderId?: string; // For backward compatibility
  intakeOrderId?: string;
  intakeInvoiceUrl?: string; // URL to complete the draft order payment
  customerId?: string;
  paymentMode?: 'pos' | 'invoice';
  depositAmount?: number;
  error?: string;
}

export const loader = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  console.log("Loader called with method:", request.method);
  
  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
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
  
  console.log("Method not allowed in loader:", request.method);
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
};

export const action = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  console.log("Action called with method:", request.method);
  
  try {
    // Authenticate the request
    const { session } = await authenticate.admin(request);
    
    if (!session) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Parse request body
    const body = await request.json() as CreateTicketRequest;
    const paymentMode = body.paymentMode === 'pos' ? 'pos' : 'invoice';
    
    // Validate required fields
    if (!body.depositAmount || !isValidAmount(body.depositAmount)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Valid deposit amount is required" 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Handle customer resolution
    let customerId: string;
    
    if (body.customerId) {
      // Use existing customer
      customerId = body.customerId;
      console.log("Using existing customer:", customerId);
    } else if (body.createNewCustomer) {
      // Create new customer
      console.log("Creating new customer:", body.createNewCustomer);
      const newCustomer = await createCustomer(request, body.createNewCustomer);
      customerId = newCustomer.id;
      console.log("Created customer:", customerId);
    } else if (body.customerSearch) {
      // Search for existing customer
      console.log("Searching for customer:", body.customerSearch);
      const customers = await searchCustomers(request, body.customerSearch);
      
      if (customers.length === 0) {
        console.log("No customers found");
        return new Response(JSON.stringify({ 
          success: false, 
          error: "No customer found. Please create a new customer or try a different search." 
        }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
      }
      
      // For now, use the first result. In a real app, you'd let the user select
      customerId = customers[0].id;
      console.log("Found customer:", customerId);
    } else {
      console.log("No customer information provided");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Customer information is required" 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Get or create shop record
    let shop = await prisma.shop.findUnique({
      where: { shopDomain: session.shop }
    });

    if (!shop) {
      shop = await prisma.shop.create({
        data: {
          shopDomain: session.shop,
          accessToken: session.accessToken,
          scope: session.scope || "",
        }
      });
    }

    // Calculate remaining amount
    const quotedAmount = body.quotedAmount || 0;
    const remainingAmount = calculateRemainingAmount(quotedAmount, body.depositAmount);

    // Create ticket in database
    const ticket = await prisma.ticket.create({
      data: {
        shopId: shop.id,
        shopDomain: session.shop,
        status: TICKET_STATUSES.INTAKE,
        customerId: customerId,
        deviceType: body.deviceType,
        deviceBrand: body.deviceBrand,
        deviceModel: body.deviceModel,
        serial: body.serial,
        issueDescription: body.issueDescription,
                  photos: [], // Photos will be added later via admin UI
        quotedAmount: quotedAmount,
        depositAmount: body.depositAmount,
        remainingAmount: remainingAmount,
        technicianId: body.technicianId,
      }
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        ticketId: ticket.id,
        actor: "system",
        action: "ticket_created",
        meta: {
          customerId: customerId,
          depositAmount: body.depositAmount,
          quotedAmount: quotedAmount,
        }
      }
    });

    // Create draft order for deposit payment (will be completed manually in Shopify Admin)
    let intakeOrderId: string | undefined;
    let intakeInvoiceUrl: string | undefined;

    if (paymentMode === 'invoice' && body.depositAmount > 0) {
      try {
        const draftOrder = await createPosOrder(request, {
          customerId: customerId,
          lineItems: [{
            title: `Repair Deposit - Ticket #${ticket.id.slice(-8)}`,
            quantity: 1,
            price: body.depositAmount.toString(),
          }],
          note: `Repair ticket deposit. Ticket ID: ${ticket.id}`,
        });

        intakeOrderId = draftOrder.id;
        intakeInvoiceUrl = draftOrder.invoiceUrl;
        console.log("Created intake draft order:", intakeOrderId);
        console.log("Invoice URL:", intakeInvoiceUrl);

        // Update ticket with intake order ID
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { intakeOrderId: intakeOrderId }
        });

        // Send draft order invoice to customer for deposit
        try {
          const invoiceResult = await sendDraftOrderInvoice(request, intakeOrderId);
          if (invoiceResult.success) {
            console.log(`Deposit invoice sent successfully: ${intakeOrderId}`);
          } else {
            console.error(`Failed to send deposit invoice: ${invoiceResult.error}`);
          }
        } catch (error) {
          console.error("Error sending deposit invoice:", error);
          // Don't fail ticket creation if invoice sending fails
        }

      } catch (error) {
        console.error("Failed to create intake draft order:", error);
        // Continue without order - ticket is still created
      }
    }

    // Return success response
    const response: CreateTicketResponse = {
      success: true,
      ticketId: ticket.id,
      draftOrderId: intakeOrderId, // For backward compatibility
      intakeOrderId: intakeOrderId,
      intakeInvoiceUrl: intakeInvoiceUrl,
      customerId: customerId,
      paymentMode,
      depositAmount: body.depositAmount,
    };

    return new Response(JSON.stringify(response), { 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      } 
    });

  } catch (error) {
    console.error("Error creating ticket:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    // Check if it's a scope error
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    if (errorMessage.includes("write_customers") || errorMessage.includes("Access denied")) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: errorMessage,
        scopeIssue: true,
        solution: "Your session has outdated scopes. Please: 1) Visit /api/clear-session in your browser to clear the old session, 2) Reinstall the app, 3) Ensure SCOPES env var in Vercel matches shopify.app.toml"
      }), { 
        status: 403, // 403 Forbidden is more appropriate for scope issues
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        } 
      });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }), { 
      status: 500, 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      } 
    });
  }
};
