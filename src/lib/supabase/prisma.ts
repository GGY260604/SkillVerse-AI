import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Global cache object for Prisma and connection pool in development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  schemaVersion: string | undefined;
};

// Database connection string resolved from environment variables.
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

// ==========================================
// PostgreSQL Connection Pool Instantiation
// ==========================================

// Initialize or reuse existing pool to avoid resource exhaustion during hot reloads.
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

// ==========================================
// Prisma Adapter Instantiation
// ==========================================

// Wrap connection pool into Prisma PostgreSQL adapter.
const adapter = new PrismaPg(pool);

// Version tag to force client regeneration when schema changes.
const CURRENT_SCHEMA_VERSION = "2026-10-22-trilingual-v2";

if (process.env.NODE_ENV !== "production" && globalForPrisma.schemaVersion !== CURRENT_SCHEMA_VERSION) {
  if (globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch {
      // Disregard disconnection errors during hot module replacement.
    }
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma.schemaVersion = CURRENT_SCHEMA_VERSION;
}

// ==========================================
// Prisma Client Singleton Export
// ==========================================

// Initialize Prisma Client with adapter and configured logging levels.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
