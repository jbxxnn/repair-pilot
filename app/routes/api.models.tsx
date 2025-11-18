import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export interface Model {
  id: string;
  brandId: string;
  name: string;
  displayOrder: number;
}

export interface GetModelsResponse {
  success: boolean;
  models?: Model[];
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

    // Get brandId from query parameters
    const url = new URL(request.url);
    const brandId = url.searchParams.get("brandId");

    if (!brandId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "brandId query parameter is required" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get all models for the specified brand, ordered by display order
    const models = await prisma.model.findMany({
      where: {
        brandId: brandId,
      },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        brandId: true,
        name: true,
        displayOrder: true,
      },
    });

    const response: GetModelsResponse = {
      success: true,
      models: models,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (error) {
    console.error("Error fetching models:", error);
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

