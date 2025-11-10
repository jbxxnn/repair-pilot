import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[APP:${requestId}] ===== App layout loader called =====`);
  console.log(`[APP:${requestId}] Request URL:`, request.url);
  
  try {
    const { session } = await authenticate.admin(request);
    console.log(`[APP:${requestId}] ✅ Authentication successful`);
    console.log(`[APP:${requestId}] Session shop:`, session?.shop);
    console.log(`[APP:${requestId}] ===== End app layout loader =====`);
  } catch (error) {
    console.error(`[APP:${requestId}] ❌ Authentication failed:`, error);
    console.log(`[APP:${requestId}] ===== End app layout loader (error) =====`);
    throw error; // Re-throw to let React Router handle it
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app/tickets">Ticket Board</s-link>
        <s-link href="/app/analytics">Reports & Analytics</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
