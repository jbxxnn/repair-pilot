import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

// Prisma Client configuration
// For serverless: Prisma handles connection pooling automatically
// The singleton pattern works because Vercel reuses containers between invocations
const prismaClientOptions = {
  log: process.env.NODE_ENV === "development" 
    ? ["query", "info", "warn", "error"] 
    : ["error"],
};

// Use global singleton to reuse connections across serverless invocations
// This works because Vercel reuses containers when they're warm
const prisma = 
  global.prismaGlobal ?? 
  (global.prismaGlobal = new PrismaClient(prismaClientOptions));

// Log connection status in development
if (process.env.NODE_ENV === "development") {
  console.log("Prisma Client initialized");
}

export default prisma;
