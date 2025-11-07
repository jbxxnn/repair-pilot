import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getDraftOrderStatus } from "../services/shopify.server";

export interface OrderStatusRequest {
  orderIds: string[];
}

export interface OrderStatusResponse {
  success: boolean;
  orders: Array<{
    orderId: string;
    status: string | null;
    completedAt: string | null;
    isPaid: boolean;
    financialStatus: string | null;
    orderName: string | null;
  }>;
  error?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<Response> => {
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
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json() as OrderStatusRequest;
    
    if (!body.orderIds || !Array.isArray(body.orderIds)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "orderIds array is required" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Fetch status for all orders
    const orderStatuses = await Promise.all(
      body.orderIds.map(async (orderId) => {
        const status = await getDraftOrderStatus(request, orderId);
        
        if (!status) {
          return {
            orderId,
            status: null,
            completedAt: null,
            isPaid: false,
            financialStatus: null,
            orderName: null,
          };
        }

        // If draft order has been completed and converted to an order
        if (status.order) {
          return {
            orderId,
            status: status.status,
            completedAt: status.completedAt,
            isPaid: status.order.fullyPaid,
            financialStatus: status.order.financialStatus,
            orderName: status.order.name,
          };
        }

        // Still a draft order
        return {
          orderId,
          status: status.status,
          completedAt: status.completedAt,
          isPaid: false,
          financialStatus: null,
          orderName: null,
        };
      })
    );

    return new Response(JSON.stringify({
      success: true,
      orders: orderStatuses,
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error fetching order statuses:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch order statuses"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};




