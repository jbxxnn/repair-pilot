import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

console.log("[SHOPIFY] Initializing Shopify app");
console.log("[SHOPIFY] SHOPIFY_API_KEY exists:", !!process.env.SHOPIFY_API_KEY);
console.log("[SHOPIFY] SHOPIFY_API_SECRET exists:", !!process.env.SHOPIFY_API_SECRET);
console.log("[SHOPIFY] SHOPIFY_APP_URL:", process.env.SHOPIFY_APP_URL);
console.log("[SHOPIFY] SCOPES:", process.env.SCOPES);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

console.log("[SHOPIFY] Shopify app initialized");

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

// Wrap authenticate with debugging - preserve all methods from original
const originalAuthenticate = shopify.authenticate;

export const authenticate = {
  ...originalAuthenticate,
  admin: async (request: Request) => {
    console.log("[AUTH] authenticate.admin called");
    console.log("[AUTH] Request URL:", request.url);
    console.log("[AUTH] Request method:", request.method);
    
    // Log headers (be careful not to log sensitive data)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Don't log full authorization or cookie values
      if (key.toLowerCase() === "authorization") {
        headers[key] = value.substring(0, 20) + "...";
      } else if (key.toLowerCase() === "cookie") {
        headers[key] = value.length > 50 ? value.substring(0, 50) + "..." : value;
      } else {
        headers[key] = value;
      }
    });
    console.log("[AUTH] Request headers:", JSON.stringify(headers, null, 2));
    
    // Extract shop from URL if present
    try {
      const url = new URL(request.url);
      const shopFromQuery = url.searchParams.get("shop");
      const shopFromHost = url.hostname;
      console.log("[AUTH] Shop from query param:", shopFromQuery);
      console.log("[AUTH] Shop from hostname:", shopFromHost);
    } catch (error) {
      console.error("[AUTH] Error parsing URL:", error);
    }
    
    try {
      const result = await originalAuthenticate.admin(request);
      console.log("[AUTH] Authentication successful");
      console.log("[AUTH] Session shop:", result.session?.shop);
      console.log("[AUTH] Session exists:", !!result.session);
      if (result.session) {
        console.log("[AUTH] Session ID:", result.session.id);
        console.log("[AUTH] Session scope:", result.session.scope);
      }
      return result;
    } catch (error) {
      console.error("[AUTH] Authentication failed:", error);
      if (error instanceof Error) {
        console.error("[AUTH] Error message:", error.message);
        console.error("[AUTH] Error stack:", error.stack);
      }
      throw error;
    }
  },
} as typeof originalAuthenticate;
