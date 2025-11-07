import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getStaffMembers, type StaffMember } from "../services/shopify.server";

export interface Technician {
  id: string;
  name: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  active: boolean;
}

export interface GetTechniciansResponse {
  success: boolean;
  technicians?: Technician[];
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
    const activeOnly = url.searchParams.get("activeOnly") === "true";

    // Get staff members from Shopify
    const staffMembers = await getStaffMembers(request, activeOnly);

    // Transform staff members for response
    const technicians: Technician[] = staffMembers.map(staff => ({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone,
      active: staff.active,
    }));

    // Return success response
    const response: GetTechniciansResponse = {
      success: true,
      technicians: technicians,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (error) {
    console.error("Error fetching staff members:", error);

    // If it's a scope/permission error, return empty list with a warning
    if (error instanceof Error && error.message.includes("read_users")) {
      console.warn("read_users scope not available. Returning empty technicians list.");
      return new Response(JSON.stringify({
        success: true,
        technicians: [],
        warning: "read_users scope is required to fetch staff members. Please add it to your app scopes."
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

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

  // Technicians are now managed through Shopify POS/Admin Staff settings
// This endpoint only supports GET (listing staff members)
// To add/edit/remove staff members, use Shopify Admin > Settings > Staff or Shopify POS Staff settings

export const action = async (): Promise<Response> => {
  return new Response(JSON.stringify({ 
    success: false, 
    error: "Staff members are managed through Shopify Admin/POS settings. Use GET to list staff members." 
  }), { 
    status: 405, 
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    } 
  });
};
