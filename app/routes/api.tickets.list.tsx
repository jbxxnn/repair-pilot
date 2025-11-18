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
  depositPaymentOrderId: string | null;
  depositPaymentOrderName: string | null;
  depositPaymentMethod: string | null;
  depositCollectedAt: Date | null;
  depositCollectedAmount: number | null;
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
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[TICKETS:${requestId}] ===== Tickets list loader called =====`);
  console.log(`[TICKETS:${requestId}] Request URL:`, request.url);
  console.log(`[TICKETS:${requestId}] Request method:`, request.method);
  
  // Log request headers (sanitized)
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === "authorization") {
      headers[key] = value.substring(0, 20) + "...";
    } else if (key.toLowerCase() === "cookie") {
      headers[key] = value.length > 100 ? value.substring(0, 100) + "..." : value;
    } else {
      headers[key] = value;
    }
  });
  console.log(`[TICKETS:${requestId}] Request headers:`, JSON.stringify(headers, null, 2));
  
  // Extract URL params
  try {
    const url = new URL(request.url);
    console.log(`[TICKETS:${requestId}] URL search params:`, Object.fromEntries(url.searchParams.entries()));
  } catch (error) {
    console.error(`[TICKETS:${requestId}] Error parsing URL:`, error);
  }
  
  try {
    // Test database connection
    console.log(`[TICKETS:${requestId}] Testing database connection...`);
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1 as test`;
      const duration = Date.now() - startTime;
      console.log(`[TICKETS:${requestId}] ✅ Database connection verified (${duration}ms)`);
    } catch (dbError) {
      console.error(`[TICKETS:${requestId}] ❌ Database connection error:`, dbError);
      if (dbError instanceof Error) {
        console.error(`[TICKETS:${requestId}] Error name:`, dbError.name);
        console.error(`[TICKETS:${requestId}] Error message:`, dbError.message);
        console.error(`[TICKETS:${requestId}] Error stack:`, dbError.stack);
      }
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Database connection failed: ${dbError instanceof Error ? dbError.message : "Unknown error"}. Please check your DATABASE_URL environment variable.`,
        debug: {
          requestId,
          errorType: dbError instanceof Error ? dbError.name : typeof dbError,
          errorMessage: dbError instanceof Error ? dbError.message : String(dbError),
        }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Test session storage
    console.log(`[TICKETS:${requestId}] Attempting authentication...`);
    const authStartTime = Date.now();
    const { session } = await authenticate.admin(request);
    const authDuration = Date.now() - authStartTime;
    console.log(`[TICKETS:${requestId}] Authentication completed (${authDuration}ms)`);
    console.log(`[TICKETS:${requestId}] Session shop:`, session?.shop);
    console.log(`[TICKETS:${requestId}] Session exists:`, !!session);
    console.log(`[TICKETS:${requestId}] Session ID:`, session?.id);

    if (!session) {
      console.error(`[TICKETS:${requestId}] ❌ No session found after authentication`);
      // Try to get shop from query parameter as fallback
      const url = new URL(request.url);
      const shopFromQuery = url.searchParams.get("shop");
      console.log(`[TICKETS:${requestId}] Shop from query param:`, shopFromQuery);
      
      // Check database for sessions
      try {
        const sessionCount = await prisma.session.count();
        console.log(`[TICKETS:${requestId}] Total sessions in database:`, sessionCount);
        
        // Try to find any recent sessions
        const recentSessions = await prisma.session.findMany({
          take: 5,
          orderBy: { expires: "desc" },
          select: { id: true, shop: true, expires: true, isOnline: true }
        });
        console.log(`[TICKETS:${requestId}] Recent sessions:`, recentSessions);
      } catch (sessionError) {
        console.error(`[TICKETS:${requestId}] Error checking sessions:`, sessionError);
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Authentication required. Please ensure you're accessing this app through Shopify Admin.",
        debug: {
          requestId,
          shopFromQuery,
          url: request.url,
        }
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log(`[TICKETS:${requestId}] ✅ Session found for shop:`, session.shop);

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const technicianId = url.searchParams.get("technicianId");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    console.log(`[TICKETS:${requestId}] Query params:`, { status, technicianId, limit, offset });

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

    console.log(`[TICKETS:${requestId}] Database query where clause:`, JSON.stringify(where, null, 2));

    // Get tickets (technician info will be fetched from Shopify)
    console.log(`[TICKETS:${requestId}] Querying database for tickets...`);
    const queryStartTime = Date.now();
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    const queryDuration = Date.now() - queryStartTime;
    console.log(`[TICKETS:${requestId}] ✅ Found ${tickets.length} tickets (${queryDuration}ms)`);

    // Transform tickets and fetch technician info from Shopify
    console.log(`[TICKETS:${requestId}] Transforming ${tickets.length} tickets...`);
    const transformStartTime = Date.now();
    const transformedTickets: Ticket[] = await Promise.all(
      tickets.map(async (ticket, index) => {
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
            console.error(`[TICKETS:${requestId}] Error fetching staff member ${ticket.technicianId} for ticket ${index}:`, error);
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
          depositPaymentOrderId: ticket.depositPaymentOrderId,
          depositPaymentOrderName: ticket.depositPaymentOrderName,
          depositPaymentMethod: ticket.depositPaymentMethod,
          depositCollectedAt: ticket.depositCollectedAt,
          depositCollectedAmount: ticket.depositCollectedAmount ? ticket.depositCollectedAmount.toNumber() : null,
          technicianId: ticket.technicianId,
          technician,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        };
      })
    );
    const transformDuration = Date.now() - transformStartTime;
    console.log(`[TICKETS:${requestId}] ✅ Tickets transformed (${transformDuration}ms)`);

    // Return success response
    const response: GetTicketsResponse = {
      success: true,
      tickets: transformedTickets,
    };

    const totalDuration = Date.now() - authStartTime;
    console.log(`[TICKETS:${requestId}] ✅ Request completed successfully (total: ${totalDuration}ms)`);
    console.log(`[TICKETS:${requestId}] ===== End tickets list loader =====`);

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (error) {
    console.error(`[TICKETS:${requestId}] ❌ Error fetching tickets:`, error);
    if (error instanceof Error) {
      console.error(`[TICKETS:${requestId}] Error name:`, error.name);
      console.error(`[TICKETS:${requestId}] Error message:`, error.message);
      console.error(`[TICKETS:${requestId}] Error stack:`, error.stack);
    }
    console.log(`[TICKETS:${requestId}] ===== End tickets list loader (error) =====`);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      debug: {
        requestId,
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });
  }
};
