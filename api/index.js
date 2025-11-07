// Vercel serverless function for React Router v7
// This handles all routes and serves the React Router app

import { installGlobals } from "@react-router/node";
import { createRequestHandler } from "@react-router/node";

// Install fetch and other globals for Node.js
installGlobals();

// Lazy load the build to avoid issues during cold starts
let handleRequest;
let buildPromise;

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
    // Skip static assets - these should be served by Vercel directly
    if (req.url.startsWith("/build/") || req.url.startsWith("/_build/")) {
      return res.status(404).end();
    }

    // Lazy load the build
    if (!handleRequest) {
      const build = await getBuild();
      handleRequest = createRequestHandler({
        build,
        mode: process.env.NODE_ENV || "production",
      });
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

