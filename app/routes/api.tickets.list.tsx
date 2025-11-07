import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { TICKET_STATUSES } from "../utils/ticket-status";
import { getStaffMember } from "../services/shopify.server";

export interface Ticket {
  id: string;
  shopDomain: string;
  status: string;
  customerId: string;
  deviceType: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  serial: string | null;
  issueDescription: string | null;
  photos: string[];
  quotedAmount: number | null;
  depositAmount: number;
  remainingAmount: number;
  intakeOrderId: string | null;
  finalOrderId: string | null;
  technicianId: string | null;
  technician?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetTicketsResponse {
  success: boolean;
  tickets?: Ticket[];
  error?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<Response> => {
  console.log("Tickets list loader called");
  console.log("Request URL:", request.url);
  console.log("Request headers:", Object.fromEntries(request.headers.entries()));
  
  try {
    // Test database connection
    try {
      // Prisma automatically connects, but we can test with a simple query
      await prisma.$queryRaw`SELECT 1`;
      console.log("Database connection verified");
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Database connection failed: ${dbError instanceof Error ? dbError.message : "Unknown error"}. Please check your DATABASE_URL environment variable.` 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { session } = await authenticate.admin(request);
    console.log("Session:", session?.shop);
    console.log("Session exists:", !!session);

    if (!session) {
      console.log("No session found");
      // Try to get shop from query parameter as fallback
      const url = new URL(request.url);
      const shopFromQuery = url.searchParams.get("shop");
      console.log("Shop from query:", shopFromQuery);
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Authentication required. Please ensure you're accessing this app through Shopify Admin." 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const technicianId = url.searchParams.get("technicianId");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    console.log("Query params:", { status, technicianId, limit, offset });

    // Build where clause
    const where: any = {
      shopDomain: session.shop,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (technicianId && technicianId !== "all") {
      if (technicianId === "unassigned") {
        where.technicianId = null;
      } else {
        where.technicianId = technicianId;
      }
    }

    console.log("Where clause:", where);

    // Get tickets (technician info will be fetched from Shopify)
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    console.log(`Found ${tickets.length} tickets`);

    // Transform tickets and fetch technician info from Shopify
    const transformedTickets: Ticket[] = await Promise.all(
      tickets.map(async (ticket) => {
        let technician = null;
        
        // Fetch technician info from Shopify if technicianId exists
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
            // Continue without technician info if fetch fails
          }
        }

        return {
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
      })
    );

    // Return success response
    const response: GetTicketsResponse = {
      success: true,
      tickets: transformedTickets,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (error) {
    console.error("Error fetching tickets:", error);

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
