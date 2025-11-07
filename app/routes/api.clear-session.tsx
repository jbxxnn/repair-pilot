import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * Helper endpoint to clear old sessions that have outdated scopes
 * This can be called manually to force a re-authentication with new scopes
 */
export const action = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  try {
    // Authenticate to get the current shop
    const { session } = await authenticate.admin(request);
    
    if (!session) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Authentication required" 
      }), { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const shop = session.shop;
    console.log(`[CLEAR_SESSION] Clearing sessions for shop: ${shop}`);
    console.log(`[CLEAR_SESSION] Current session scope: ${session.scope}`);
    
    // Delete all sessions for this shop
    const deleted = await prisma.session.deleteMany({
      where: { shop }
    });
    
    console.log(`[CLEAR_SESSION] Deleted ${deleted.count} sessions`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Cleared ${deleted.count} session(s). Please re-authenticate the app.`,
      shop,
      oldScope: session.scope
    }), { 
      headers: { "Content-Type": "application/json" } 
    });
    
  } catch (error) {
    console.error("[CLEAR_SESSION] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
};

