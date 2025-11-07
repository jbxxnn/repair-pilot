import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { uploadPhotos } from "../services/shopify.server";

export interface UploadPhotosResponse {
  success: boolean;
  files?: Array<{
    id: string;
    url: string;
    alt?: string;
  }>;
  error?: string;
}

export const action = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  try {
    // Authenticate the request
    const { session } = await authenticate.admin(request);
    
    if (!session) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No files provided" 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Filter out empty files
    const validFiles = files.filter(file => file.size > 0 && file.type.startsWith("image/"));

    if (validFiles.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No valid image files provided" 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Upload photos
    const uploadedFiles = await uploadPhotos(request, validFiles, "Device photo");

    // Return success response
    const response: UploadPhotosResponse = {
      success: true,
      files: uploadedFiles,
    };

    return new Response(JSON.stringify(response), { 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      } 
    });

  } catch (error) {
    console.error("Error uploading photos:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }), { 
      status: 500, 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      } 
    });
  }
};

export const loader = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  return new Response(JSON.stringify({ error: "Method not allowed. Use POST to upload photos." }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
};






