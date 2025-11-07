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
  try {
    // Install globals first (only once)
    await installGlobalsOnce();

    // Skip static assets - these should be served by Vercel directly
    if (req.url.startsWith("/build/") || req.url.startsWith("/_build/")) {
      return res.status(404).end();
    }

    // Lazy load the build and create handler
    if (!handleRequest) {
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
    }

    // Build the full URL
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const url = `${protocol}://${host}${req.url}`;
    
    // Create a Web API Request object
    const requestInit = {
      method: req.method,
      headers: new Headers(req.headers),
    };

    // Add body for non-GET requests
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body) {
        requestInit.body = typeof req.body === "string" 
          ? req.body 
          : JSON.stringify(req.body);
      }
    }

    const request = new Request(url, requestInit);

    // Handle the request with React Router
    const response = await handleRequest(request);
    
    // Convert Response to Vercel's response format
    const body = await response.text();
    const headers = Object.fromEntries(response.headers.entries());
    
    // Set status and headers
    res.status(response.status);
    Object.entries(headers).forEach(([key, value]) => {
      // Skip content-encoding header as Vercel handles compression
      if (key.toLowerCase() !== "content-encoding") {
        res.setHeader(key, value);
      }
    });
    
    res.send(body);
  } catch (error) {
    console.error("Error handling request:", error);
    console.error("Request URL:", req.url);
    console.error("Error message:", error.message);
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    res.status(500).json({ 
      error: error.message,
      url: req.url,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}
