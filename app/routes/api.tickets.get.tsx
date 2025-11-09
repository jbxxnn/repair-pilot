import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getStaffMember } from "../services/shopify.server";
import type { Ticket } from "./api.tickets.list";

export interface GetTicketResponse {
  success: boolean;
  ticket?: Ticket;
  error?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<Response> => {
  try {
    const { session } = await authenticate.admin(request);

    if (!session) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get ticket ID from query parameters
    const url = new URL(request.url);
    const ticketId = url.searchParams.get("ticketId");

    if (!ticketId) {
      return new Response(JSON.stringify({ success: false, error: "Ticket ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        shopDomain: session.shop,
      },
    });

    if (!ticket) {
      return new Response(JSON.stringify({ success: false, error: "Ticket not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Fetch technician info from Shopify if technicianId exists
    let technician = null;
    if (ticket.technicianId) {
      try {
        const staffMember = await getStaffMember(request, ticket.technicianId);
        if (staffMember) {
          technician = {
            id: staffMember.id,
            name: staffMember.name,
            email: staffMember.email,
            phone: staffMember.phone,
          };
        }
      } catch (error) {
        console.error(`Error fetching staff member ${ticket.technicianId}:`, error);
      }
    }

    // Transform ticket
    const transformedTicket: Ticket = {
      id: ticket.id,
      shopDomain: ticket.shopDomain,
      status: ticket.status,
      customerId: ticket.customerId,
      deviceType: ticket.deviceType,
      deviceBrand: ticket.deviceBrand,
      deviceModel: ticket.deviceModel,
      serial: ticket.serial,
      issueDescription: ticket.issueDescription,
      photos: Array.isArray(ticket.photos) ? ticket.photos : [],
      quotedAmount: ticket.quotedAmount ? ticket.quotedAmount.toNumber() : null,
      depositAmount: ticket.depositAmount.toNumber(),
      remainingAmount: ticket.remainingAmount.toNumber(),
      intakeOrderId: ticket.intakeOrderId,
      finalOrderId: ticket.finalOrderId,
      technicianId: ticket.technicianId,
      technician,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };

    const response: GetTicketResponse = {
      success: true,
      ticket: transformedTicket,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (error) {
    console.error("Error fetching ticket:", error);

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









