import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export interface AddPhotosRequest {
  ticketId: string;
  photos: string[]; // Array of photo URLs
}

export interface AddPhotosResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const action = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  try {
    const { session } = await authenticate.admin(request);

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body: AddPhotosRequest = await request.json();

    if (!body.ticketId || !body.photos || !Array.isArray(body.photos)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request data" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get current ticket to merge photos and verify it belongs to the shop
    const ticket = await prisma.ticket.findFirst({
      where: { 
        id: body.ticketId,
        shopDomain: session.shop
      },
    });

    if (!ticket) {
      return new Response(
        JSON.stringify({ success: false, error: "Ticket not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Merge existing photos with new photos
    const currentPhotos = Array.isArray(ticket.photos) ? (ticket.photos as string[]) : [];
    const updatedPhotos = [...currentPhotos, ...body.photos];

    // Update ticket with merged photos
    await prisma.ticket.update({
      where: { id: body.ticketId },
      data: {
        photos: updatedPhotos,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Added ${body.photos.length} photo(s) to ticket`,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error adding photos to ticket:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};


