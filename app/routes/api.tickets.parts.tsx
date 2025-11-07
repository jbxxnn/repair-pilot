import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export interface PartsUsed {
  id: string;
  ticketId: string;
  name: string | null;
  sku: string | null;
  quantity: number;
  cost: number;
}

export interface AddPartRequest {
  ticketId: string;
  name?: string;
  sku?: string;
  quantity: number;
  cost: number;
}

export interface UpdatePartRequest {
  partId: string;
  name?: string;
  sku?: string;
  quantity?: number;
  cost?: number;
}

export interface DeletePartRequest {
  partId: string;
  ticketId: string;
}

// Handle CORS preflight
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // GET - List parts for a ticket
  if (request.method === "GET") {
    try {
      const { session } = await authenticate.admin(request);
      
      if (!session) {
        return new Response(JSON.stringify({ success: false, error: "Authentication required" }), { 
          status: 401, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        });
      }

      const url = new URL(request.url);
      const ticketId = url.searchParams.get("ticketId");

      if (!ticketId) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Ticket ID is required" 
        }), { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        });
      }

      // Verify ticket belongs to shop
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          shopDomain: session.shop,
        },
      });

      if (!ticket) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Ticket not found" 
        }), { 
          status: 404, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        });
      }

      // Get parts for ticket
      const parts = await prisma.partsUsed.findMany({
        where: { ticketId },
        orderBy: { id: "asc" },
      });

      const transformedParts: PartsUsed[] = parts.map(part => ({
        id: part.id,
        ticketId: part.ticketId,
        name: part.name,
        sku: part.sku,
        quantity: part.quantity,
        cost: part.cost.toNumber(),
      }));

      return new Response(JSON.stringify({
        success: true,
        parts: transformedParts,
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });

    } catch (error) {
      console.error("Error fetching parts:", error);
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
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    const method = request.method;
    const body = await request.json();

    // POST - Add part
    if (method === "POST") {
      const { ticketId, name, sku, quantity, cost } = body as AddPartRequest;

      if (!ticketId || !quantity || cost === undefined) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Ticket ID, quantity, and cost are required" 
        }), { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        });
      }

      // Verify ticket belongs to shop
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          shopDomain: session.shop,
        },
      });

      if (!ticket) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Ticket not found" 
        }), { 
          status: 404, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        });
      }

      // Create part
      const part = await prisma.partsUsed.create({
        data: {
          ticketId,
          name: name || null,
          sku: sku || null,
          quantity: quantity || 1,
          cost: cost || 0,
        },
      });

      // Update ticket remaining amount
      await updateTicketRemainingAmount(ticketId, session.shop);

      return new Response(JSON.stringify({
        success: true,
        part: {
          id: part.id,
          ticketId: part.ticketId,
          name: part.name,
          sku: part.sku,
          quantity: part.quantity,
          cost: part.cost.toNumber(),
        },
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    // PUT - Update part
    if (method === "PUT") {
      const { partId, name, sku, quantity, cost } = body as UpdatePartRequest;

      if (!partId) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Part ID is required" 
        }), { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        });
      }

      // Verify part exists and belongs to shop
      const part = await prisma.partsUsed.findFirst({
        where: { id: partId },
        include: {
          ticket: true,
        },
      });

      if (!part || part.ticket.shopDomain !== session.shop) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Part not found" 
        }), { 
          status: 404, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        });
      }

      // Update part
      const updateData: any = {};
      if (name !== undefined) updateData.name = name || null;
      if (sku !== undefined) updateData.sku = sku || null;
      if (quantity !== undefined) updateData.quantity = quantity;
      if (cost !== undefined) updateData.cost = cost;

      const updatedPart = await prisma.partsUsed.update({
        where: { id: partId },
        data: updateData,
      });

      // Update ticket remaining amount
      await updateTicketRemainingAmount(part.ticketId, session.shop);

      return new Response(JSON.stringify({
        success: true,
        part: {
          id: updatedPart.id,
          ticketId: updatedPart.ticketId,
          name: updatedPart.name,
          sku: updatedPart.sku,
          quantity: updatedPart.quantity,
          cost: updatedPart.cost.toNumber(),
        },
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    // DELETE - Remove part
    if (method === "DELETE") {
      const { partId, ticketId } = body as DeletePartRequest;

      if (!partId || !ticketId) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Part ID and Ticket ID are required" 
        }), { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        });
      }

      // Verify part exists and belongs to shop
      const part = await prisma.partsUsed.findFirst({
        where: { id: partId, ticketId },
        include: {
          ticket: true,
        },
      });

      if (!part || part.ticket.shopDomain !== session.shop) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Part not found" 
        }), { 
          status: 404, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        });
      }

      // Delete part
      await prisma.partsUsed.delete({
        where: { id: partId },
      });

      // Update ticket remaining amount
      await updateTicketRemainingAmount(ticketId, session.shop);

      return new Response(JSON.stringify({
        success: true,
        message: "Part deleted successfully",
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error) {
    console.error("Error managing parts:", error);
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

// Helper function to recalculate and update ticket remaining amount
async function updateTicketRemainingAmount(ticketId: string, shopDomain: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, shopDomain },
    include: {
      partsUsed: true,
    },
  });

  if (!ticket) return;

  // Calculate total parts cost
  const partsTotal = ticket.partsUsed.reduce(
    (sum, part) => sum + part.cost.toNumber() * part.quantity,
    0
  );

  // Calculate remaining amount: (quotedAmount + partsTotal) - depositAmount
  const quotedAmount = ticket.quotedAmount ? ticket.quotedAmount.toNumber() : 0;
  const totalAmount = quotedAmount + partsTotal;
  const depositAmount = ticket.depositAmount.toNumber();
  const remainingAmount = Math.max(0, totalAmount - depositAmount);

  // Update ticket
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { remainingAmount },
  });
}
