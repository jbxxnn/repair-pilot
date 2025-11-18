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
    const contentType = request.headers.get("content-type") || request.headers.get("Content-Type");
    console.log("[PHOTO_UPLOAD] Content-Type header:", contentType);

    // Authenticate first using a header-only clone so the original request body remains untouched
    const authRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
    });

    const authContext = await authenticate.admin(authRequest);

    if (!authContext.session) {
      return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error("[PHOTO_UPLOAD] Failed to parse form data:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to parse upload form data. Ensure you are sending multipart/form-data.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const files = formData.getAll("files") as File[];
    console.log(`[PHOTO_UPLOAD] Received ${files?.length || 0} total file(s)`);

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No files provided",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validFiles = files.filter((file) => file.size > 0 && file.type.startsWith("image/"));
    console.log(`[PHOTO_UPLOAD] ${validFiles.length} valid image file(s) after filtering`);

    if (validFiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No valid image files provided",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Upload photos using the authenticated request (header-only clone)
    const uploadedFiles = await uploadPhotos(authRequest, validFiles, "Device photo");

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






