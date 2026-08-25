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

if (!isProduction) {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export default prisma;