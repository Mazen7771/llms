/**
 * Environment validation utility
 * Validates all required environment variables at startup
 * Fails fast with clear error messages
 */

interface EnvConfig {
  DATABASE_URL: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  TEACHER_PASSWORD: string;
  // Optional but recommended
  EMAIL_SERVER_HOST?: string;
  EMAIL_SERVER_PORT?: string;
  EMAIL_SERVER_USER?: string;
  EMAIL_SERVER_PASSWORD?: string;
  EMAIL_FROM?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_STREAM_DOMAIN?: string;
  AWS_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_S3_BUCKET?: string;
  AWS_S3_ENDPOINT?: string;
  NEXT_PUBLIC_APP_URL?: string;
  AI_PROVIDER?: string;
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
}

function validateEnv(): EnvConfig {
  const requiredVars = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "TEACHER_PASSWORD",
  ] as const;

  const missing: string[] = [];
  const config: Record<string, string> = {};

  for (const key of requiredVars) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      missing.push(key);
    } else {
      config[key] = value.trim();
    }
  }

  // Validate DATABASE_URL format for Neon
  if (config.DATABASE_URL) {
    const url = config.DATABASE_URL;
    if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
      throw new Error(
        `DATABASE_URL must be a valid PostgreSQL connection string (postgresql://...). Got: ${url.substring(0, 20)}...`
      );
    }
    // Warn if not using pooler for Neon
    if (url.includes("neon.tech") && !url.includes("-pooler") && !url.includes("pgbouncer")) {
      console.warn(
        "⚠️  DATABASE_URL appears to be a Neon direct connection. For serverless, use the pooler endpoint (ep-*-pooler.*) or add ?pgbouncer=true"
      );
    }
  }

  // Validate NEXTAUTH_SECRET strength
  if (config.NEXTAUTH_SECRET && config.NEXTAUTH_SECRET.length < 32) {
    console.warn(
      `⚠️  NEXTAUTH_SECRET should be at least 32 characters for security. Current length: ${config.NEXTAUTH_SECRET.length}`
    );
  }

  // Validate NEXTAUTH_URL format
  if (config.NEXTAUTH_URL) {
    try {
      new URL(config.NEXTAUTH_URL);
    } catch {
      throw new Error(`NEXTAUTH_URL must be a valid URL. Got: ${config.NEXTAUTH_URL}`);
    }
  }

  if (missing.length > 0) {
    const errorMsg = [
      "❌ Missing required environment variables:",
      missing.map((v) => `  - ${v}`).join("\n"),
      "",
      "Please set these in your Vercel project settings or .env file.",
      "See .env.example for reference.",
    ].join("\n");
    throw new Error(errorMsg);
  }

  // Optional vars - just copy if present
  const optionalVars = [
    "EMAIL_SERVER_HOST",
    "EMAIL_SERVER_PORT",
    "EMAIL_SERVER_USER",
    "EMAIL_SERVER_PASSWORD",
    "EMAIL_FROM",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_STREAM_DOMAIN",
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_BUCKET",
    "AWS_S3_ENDPOINT",
    "NEXT_PUBLIC_APP_URL",
    "AI_PROVIDER",
    "GEMINI_API_KEY",
    "DEEPSEEK_API_KEY",
  ] as const;

  for (const key of optionalVars) {
    const value = process.env[key];
    if (value && value.trim() !== "") {
      config[key] = value.trim();
    }
  }

  return config as unknown as EnvConfig;
}

// Check if we're in a build phase (Next.js build time)
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-development-build";

// Validate on module load (fails fast at runtime, not build time)
let envConfig: EnvConfig;

if (isBuildTime) {
  // During build, provide empty config to allow compilation
  envConfig = {
    DATABASE_URL: process.env.DATABASE_URL || "",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "",
    TEACHER_PASSWORD: process.env.TEACHER_PASSWORD || "",
  };
} else {
  try {
    envConfig = validateEnv();
    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Environment validation passed");
      console.log(`   DATABASE_URL: ${envConfig.DATABASE_URL?.substring(0, 30)}...`);
      console.log(`   NEXTAUTH_URL: ${envConfig.NEXTAUTH_URL}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      // In production, log error but don't crash during build
      console.error("❌ Environment validation failed:", error);
    } else {
      // In development, throw to fail fast
      throw error;
    }
    // Provide fallback to prevent TypeScript errors
    envConfig = {
      DATABASE_URL: process.env.DATABASE_URL || "",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "",
      TEACHER_PASSWORD: process.env.TEACHER_PASSWORD || "",
    };
  }
}

export const env = envConfig;

// Helper to check if all required vars are present
export function isEnvValid(): boolean {
  return !!(
    env.DATABASE_URL &&
    env.NEXTAUTH_SECRET &&
    env.NEXTAUTH_URL &&
    env.TEACHER_PASSWORD
  );
}

// Runtime validation function - call this in API routes, not at module load
export function validateEnvAtRuntime(): void {
  if (isBuildTime) {
    return; // Skip during build
  }
  if (!isEnvValid()) {
    throw new Error("Invalid environment configuration - check server logs");
  }
}