import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getCustomer } from "../services/shopify.server";

export interface GetCustomerRequest {
  customerId: string;
}

export interface GetCustomerResponse {
  success: boolean;
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    displayName: string;
    email?: string;
    phone?: string;
  };
  error?: string;
}

export const loader = async ({ request }: ActionFunctionArgs) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
};

export const action = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  try {
    // Authenticate the request
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

    // Parse request body
    const body = await request.json() as GetCustomerRequest;
    
    // Validate required fields
    if (!body.customerId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Customer ID is required" 
      }), { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    // Get customer details from Shopify
    const customer = await getCustomer(request, body.customerId);
    
    if (!customer) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Customer not found" 
      }), { 
        status: 404, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    // Return success response
    const response: GetCustomerResponse = {
      success: true,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        displayName: customer.displayName,
        email: customer.email,
        phone: customer.phone,
      },
    };

    return new Response(JSON.stringify(response), { 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      } 
    });

  } catch (error) {
    console.error("Error fetching customer:", error);
    
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








