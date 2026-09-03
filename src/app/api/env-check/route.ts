/**
 * GET /api/env-check — Diagnostic endpoint.
 * Reports which required env vars are set (non-empty) WITHOUT revealing their values.
 * Remove this endpoint after diagnosing the production auth issue.
 */
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

  return Response.json({
    ok: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
    status,
  });
}
