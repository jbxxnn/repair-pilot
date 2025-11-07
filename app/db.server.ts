import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

// Debug: Log environment
console.log("[DB] Initializing Prisma Client");
console.log("[DB] NODE_ENV:", process.env.NODE_ENV);
console.log("[DB] DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("[DB] DATABASE_URL length:", process.env.DATABASE_URL?.length || 0);
if (process.env.DATABASE_URL) {
  // Log first 20 chars and last 10 chars (without exposing full credentials)
  const dbUrl = process.env.DATABASE_URL;
  const masked = dbUrl.substring(0, 20) + "..." + dbUrl.substring(dbUrl.length - 10);
  console.log("[DB] DATABASE_URL preview:", masked);
}

// Prisma Client configuration
// For serverless: Prisma handles connection pooling automatically
// The singleton pattern works because Vercel reuses containers between invocations
const prismaClientOptions = {
  log: process.env.NODE_ENV === "development" 
    ? ["query", "info", "warn", "error"] 
    : process.env.NODE_ENV === "production"
    ? ["error", "warn"]
    : ["error"],
};

// Use global singleton to reuse connections across serverless invocations
// This works because Vercel reuses containers when they're warm
const prisma = 
  global.prismaGlobal ?? 
  (global.prismaGlobal = new PrismaClient(prismaClientOptions));

console.log("[DB] Prisma Client created");

// Add connection event listeners for debugging
prisma.$on("error" as never, (e: any) => {
  console.error("[DB] Prisma error:", e);
});

prisma.$on("info" as never, (e: any) => {
  console.log("[DB] Prisma info:", e);
});

prisma.$on("warn" as never, (e: any) => {
  console.warn("[DB] Prisma warn:", e);
});

// Test connection on initialization (non-blocking)
(async () => {
  try {
    await prisma.$connect();
    console.log("[DB] Prisma Client connected successfully");
    
    // Test with a simple query
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log("[DB] Database connection test passed");
  } catch (error) {
    console.error("[DB] Failed to connect to database:", error);
    if (error instanceof Error) {
      console.error("[DB] Error message:", error.message);
      console.error("[DB] Error stack:", error.stack);
    }
  }
})();

export default prisma;
