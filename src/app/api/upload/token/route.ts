import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

/**
 * Issue a short-lived, scoped client token so the browser can upload
 * directly to Vercel Blob — completely bypassing both the serverless
 * function body limit (4.5 MB) and the Neon DB (which can't stage
 * large uploads under the 512 MB free tier cap).
 *
 * The token is:
 *   • scoped to resources/{uuid}-<filename> (random suffix via Vercel Blob)
 *   • capped at 200 MB per file
 *   • valid for 30 minutes (longer than any upload should take)
 *   • requires a valid TEACHER session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If Blob is not configured on this deployment, tell the client to
    // fall back to the DB-chunked upload path.
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ available: false });
    }

    const body = await request.json().catch(() => ({}));
    const filename = (body.filename as string) || "file";
    const safeName = filename.replace(/[^\w.\- ]/g, "_").slice(0, 120);

    const pathname = `resources/${crypto.randomUUID()}-${safeName}`;

    const clientToken = await generateClientTokenFromReadWriteToken({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      pathname,
      maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB cap
      addRandomSuffix: true,
      validUntil: Date.now() + 30 * 60 * 1000, // 30 min
    });

    return NextResponse.json({
      available: true,
      clientToken,
      pathname,
    });
  } catch (error) {
    console.error("Failed to generate client upload token:", error);
    return NextResponse.json(
      { error: "Could not generate upload token" },
      { status: 500 }
    );
  }
}
