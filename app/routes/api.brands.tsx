import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export interface Brand {
  id: string;
  name: string;
  displayOrder: number;
}

export interface GetBrandsResponse {
  success: boolean;
  brands?: Brand[];
  error?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<Response> => {
  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    const { session } = await authenticate.admin(request);

    if (!session) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get all brands, ordered by display order
    const brands = await prisma.brand.findMany({
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        displayOrder: true,
      },
    });

    const response: GetBrandsResponse = {
      success: true,
      brands: brands,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (error) {
    console.error("Error fetching brands:", error);
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

