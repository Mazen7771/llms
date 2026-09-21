/**
 * GET /api/env-check — Diagnostic endpoint.
 * Reports which required env vars are set (non-empty) WITHOUT revealing their values,
 * plus which database host is actually configured and whether a real query against it
 * succeeds right now. Never returns the password portion of any connection string.
 * Remove this endpoint after diagnosing the production auth issue.
 */
import { prisma } from "@/lib/prisma";

function extractHost(connectionString: string | undefined): string | null {
  if (!connectionString) return null;
  try {
    const url = new URL(connectionString);
    return url.hostname || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const required = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "TEACHER_PASSWORD"];
  const optional = [
    "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_STREAM_DOMAIN",
    "AWS_ACCESS_KEY_ID", "AWS_S3_BUCKET",
    "GEMINI_API_KEY", "GEMINI_MODEL",
  ];

  const status: Record<string, boolean> = {};
  for (const k of [...required, ...optional]) {
    status[k] = !!(process.env[k] && process.env[k]!.trim() !== "");
  }

  const missing = required.filter((k) => !status[k]);

  const databaseHost = extractHost(process.env.DATABASE_URL);
  const supabaseHost = extractHost(process.env.vv_SUPABASE_URL);

  let liveQuery: { ok: boolean; userCount?: number; adminExists?: boolean; error?: string } = { ok: false };
  try {
    const userCount = await prisma.user.count();
    const admin = await prisma.user.findUnique({ where: { studentId: "0" }, select: { studentId: true } });
    liveQuery = { ok: true, userCount, adminExists: !!admin };
  } catch (e) {
    liveQuery = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  return Response.json({
    ok: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
    status,
    databaseHost,
    supabaseHost,
    liveQuery,
  });
}
