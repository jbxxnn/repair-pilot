import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export interface RemovePhotoRequest {
  ticketId: string;
  photoUrl: string;
}

export interface RemovePhotoResponse {
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

    const body: RemovePhotoRequest = await request.json();

    if (!body.ticketId || !body.photoUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request data" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get current ticket to verify it belongs to the shop and get current photos
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

    // Remove the photo from the photos array
    const currentPhotos = Array.isArray(ticket.photos) ? (ticket.photos as string[]) : [];
    const updatedPhotos = currentPhotos.filter((url: string) => url !== body.photoUrl);

    // Update ticket with filtered photos
    await prisma.ticket.update({
      where: { id: body.ticketId },
      data: {
        photos: updatedPhotos,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Photo removed from ticket",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error removing photo from ticket:", error);
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





