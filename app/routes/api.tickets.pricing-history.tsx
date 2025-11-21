import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export interface PricingHistoryResponse {
  success: boolean;
  averagePrice?: number;
  mostRecentPrice?: number;
  matchCount?: number;
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

    // Get query parameters
    const url = new URL(request.url);
    const deviceType = url.searchParams.get("deviceType");
    const deviceBrand = url.searchParams.get("deviceBrand");
    const deviceModel = url.searchParams.get("deviceModel");
    const repairType = url.searchParams.get("repairType");

    // Build where clause - filter by device type, brand, model, and repair type
    const where: any = {
      shopDomain: session.shop,
      quotedAmount: { not: null }, // Only include tickets with quoted amounts
    };

    if (deviceType) {
      where.deviceType = deviceType;
    }

    if (deviceBrand) {
      where.deviceBrand = deviceBrand;
    }

    if (deviceModel) {
      where.deviceModel = deviceModel;
    }

    if (repairType) {
      where.repairType = repairType;
    }

    // Query historical tickets matching the criteria
    const historicalTickets = await prisma.ticket.findMany({
      where,
      select: {
        quotedAmount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter out null quotedAmounts and convert to numbers
    const prices = historicalTickets
      .map(ticket => ticket.quotedAmount?.toNumber())
      .filter((price): price is number => price !== null && price !== undefined && price > 0);

    if (prices.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        averagePrice: null,
        mostRecentPrice: null,
        matchCount: 0,
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    // Calculate average price
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Most recent price is the first one (since we ordered by createdAt desc)
    const mostRecentPrice = prices[0];

    const response: PricingHistoryResponse = {
      success: true,
      averagePrice: Math.round(averagePrice * 100) / 100, // Round to 2 decimal places
      mostRecentPrice: Math.round(mostRecentPrice * 100) / 100,
      matchCount: prices.length,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (error) {
    console.error("Error fetching pricing history:", error);
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

