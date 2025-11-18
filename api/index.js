// Vercel serverless function for React Router v7
// This handles all routes and serves the React Router app

// Use dynamic imports to avoid ESM/CJS interop issues on Vercel

// Lazy load the build to avoid issues during cold starts
let handleRequest;
let buildPromise;
let globalsInstalled = false;

async function installGlobalsOnce() {
  if (!globalsInstalled) {
    // Dynamically import to avoid ESM/CJS issues
    const nodeModule = await import("@react-router/node");
    if (nodeModule.installGlobals) {
      nodeModule.installGlobals();
    } else if (nodeModule.default && nodeModule.default.installGlobals) {
      nodeModule.default.installGlobals();
    }
    globalsInstalled = true;
  }
}

async function getBuild() {
  if (!buildPromise) {
    try {
      buildPromise = import("../build/server/index.js");
      return buildPromise;
    } catch (error) {
      console.error("Failed to load build:", error);
      throw error;
    }
  }
  return buildPromise;
}

// Vercel serverless function handler
export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  console.log(`[VERCEL:${requestId}] ===== Request received =====`);
  console.log(`[VERCEL:${requestId}] URL:`, req.url);
  console.log(`[VERCEL:${requestId}] Method:`, req.method);
  console.log(`[VERCEL:${requestId}] Headers:`, Object.keys(req.headers));
  
  try {
    // Parse the URL path
    const url = new URL(req.url, `https://${req.headers.host}`);
    const urlPath = url.pathname;
    console.log(`[VERCEL:${requestId}] Path:`, urlPath);

    // Skip static assets - these should be served by Vercel directly
    // If they reach here, it means Vercel couldn't find them, so return 404
    if (
      urlPath.startsWith("/assets/") ||
      urlPath.startsWith("/build/") ||
      urlPath.startsWith("/_build/") ||
      urlPath === "/favicon.ico" ||
      urlPath.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i)
    ) {
      console.warn(`[VERCEL:${requestId}] Static asset requested but not found: ${urlPath}`);
      return res.status(404).end();
    }
    
    console.log(`[VERCEL:${requestId}] Processing request for:`, urlPath);

    // Install globals first (only once)
    console.log(`[VERCEL:${requestId}] Installing globals...`);
    await installGlobalsOnce();
    console.log(`[VERCEL:${requestId}] Globals installed`);

    // Lazy load the build and create handler
    if (!handleRequest) {
      console.log(`[VERCEL:${requestId}] Initializing React Router handler...`);
      // Import createRequestHandler dynamically to avoid ESM/CJS issues
      const reactRouter = await import("react-router");
      const createRequestHandler = reactRouter.createRequestHandler || 
                                   (reactRouter.default && reactRouter.default.createRequestHandler) ||
                                   reactRouter.default;
      
      if (!createRequestHandler) {
        throw new Error('createRequestHandler not found in react-router. Available exports: ' + Object.keys(reactRouter).join(', '));
      }

      const build = await getBuild();
      // Use createRequestHandler from react-router package
      // It takes (build, mode) as arguments
      handleRequest = createRequestHandler(build, process.env.NODE_ENV || "production");
      console.log(`[VERCEL:${requestId}] React Router handler initialized`);
    }

    // Build the full URL (reuse the parsed URL from above)
    const fullUrl = url.toString();
    
    // Create a Web API Request object
    const requestInit = {
      method: req.method,
      headers: new Headers(req.headers),
    };

    // Add body for non-GET/HEAD requests by buffering the raw stream
    if (req.method !== "GET" && req.method !== "HEAD") {
      const bodyChunks = [];
      for await (const chunk of req) {
        bodyChunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const bodyBuffer = Buffer.concat(bodyChunks);
      requestInit.body = bodyBuffer;
      requestInit.duplex = "half";
    }

    const request = new Request(fullUrl, requestInit);
    console.log(`[VERCEL:${requestId}] Request object created, handling with React Router...`);

    // Handle the request with React Router
    const routerStartTime = Date.now();
    const response = await handleRequest(request);
    const routerDuration = Date.now() - routerStartTime;
    console.log(`[VERCEL:${requestId}] React Router handled request (${routerDuration}ms), status: ${response.status}`);
    
    // Convert Response to Vercel's response format
    const bodyStartTime = Date.now();
    const body = await response.text();
    const bodyDuration = Date.now() - bodyStartTime;
    console.log(`[VERCEL:${requestId}] Response body extracted (${bodyDuration}ms), length: ${body.length}`);
    
    const headers = Object.fromEntries(response.headers.entries());
    
    // Set status and headers
    res.status(response.status);
    Object.entries(headers).forEach(([key, value]) => {
      // Skip content-encoding header as Vercel handles compression
      if (key.toLowerCase() !== "content-encoding") {
        res.setHeader(key, value);
      }
    });
    
    const totalDuration = Date.now() - startTime;
    console.log(`[VERCEL:${requestId}] ✅ Response sent (total: ${totalDuration}ms)`);
    console.log(`[VERCEL:${requestId}] ===== Request completed =====`);
    
    res.send(body);
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[VERCEL:${requestId}] ❌ Error handling request (${totalDuration}ms):`, error);
    console.error(`[VERCEL:${requestId}] Request URL:`, req.url);
    console.error(`[VERCEL:${requestId}] Error message:`, error.message);
    if (error.stack) {
      console.error(`[VERCEL:${requestId}] Error stack:`, error.stack);
    }
    console.log(`[VERCEL:${requestId}] ===== Request failed =====`);
    res.status(500).json({ 
      error: error.message,
      url: req.url,
      requestId,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}
