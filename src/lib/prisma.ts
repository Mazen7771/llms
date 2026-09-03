import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const isProduction = process.env.NODE_ENV === "production";

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Critical for serverless/Neon pooler
    max: 1,
    idleTimeoutMillis: 10_000,
    maxUses: 7_500,
    connectionTimeoutMillis: 5_000,
    // SSL required for Neon in production
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });

// Handle pool errors gracefully
pool.on("error", (err) => {
  console.error("Unexpected pg pool error:", err);
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["query", "error", "warn"],
  });

// Cache both the pool and client on globalThis in ALL environments.
// In production (Vercel serverless), a fresh pool per cold start can
// open many new connections under concurrency and exhaust Postgres's
// connection limit, causing intermittent 500s. The serverless process
// is reused across warm invocations, so caching here is safe.
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
if (!globalForPrisma.pool) {
  globalForPrisma.pool = pool;
}

export default prisma;