import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { searchCustomers } from "../services/shopify.server";

export interface SearchCustomersRequest {
  query: string;
}

export interface SearchCustomersResponse {
  success: boolean;
  customers?: Array<{
    id: string;
    displayName: string;
    email?: string;
    phone?: string;
  }>;
  error?: string;
}

export const loader = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
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
    const body = await request.json() as SearchCustomersRequest;
    
    // Validate required fields
    if (!body.query || body.query.trim().length < 2) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Search query must be at least 2 characters" 
      }), { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    // Search customers using Shopify GraphQL
    const customers = await searchCustomers(request, body.query);
    
    console.log(`Search returned ${customers.length} customers`);
    
    // Transform customer data for the frontend
    const transformedCustomers = customers.map(customer => ({
      id: customer.id,
      displayName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.displayName || 'Unknown Customer',
      email: customer.email,
      phone: customer.phone,
    }));

    console.log("Transformed customers:", transformedCustomers);

    // Return success response
    const response: SearchCustomersResponse = {
      success: true,
      customers: transformedCustomers,
    };

    return new Response(JSON.stringify(response), { 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      } 
    });

  } catch (error) {
    console.error("Error searching customers:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), { 
      status: 500, 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      } 
    });
  }
};
