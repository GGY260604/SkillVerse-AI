// --- Database Client ---
// Configure PostgreSQL connection pool, adapter, and Prisma client singleton.
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Global cache object for Prisma and connection pool in development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Database connection string resolved from environment variables.
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

// Step 1: PostgreSQL Connection Pool
// Initialize or reuse existing pool to avoid resource exhaustion during hot reloads.
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

// Step 2: Prisma Adapter Instantiation
// Wrap connection pool into Prisma PostgreSQL adapter.
const adapter = new PrismaPg(pool);

// Step 3: Prisma Client Singleton
// Initialize Prisma Client with adapter and configured logging levels.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
