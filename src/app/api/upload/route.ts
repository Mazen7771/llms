import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const SUPABASE_BUCKET = "new-files";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .normalize("NFKC")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);

  return cleaned || "file";
}

export async function POST(request: NextRequest) {
  try {
    // Only teachers can create upload URLs.
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const fileName =
      typeof body.fileName === "string"
        ? body.fileName.trim()
        : "";

    const contentType =
      typeof body.contentType === "string" &&
      body.contentType.trim()
        ? body.contentType.trim()
        : "application/octet-stream";

    const fileSize =
      typeof body.fileSize === "number" &&
      Number.isFinite(body.fileSize)
        ? body.fileSize
        : null;

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400 }
      );
    }

    if (fileSize !== null) {
      if (fileSize <= 0) {
        return NextResponse.json(
          { error: "Invalid file size" },
          { status: 400 }
        );
      }

      if (fileSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error:
              "File is too large. Maximum allowed size is 100 MB.",
          },
          { status: 413 }
        );
      }
    }

    const supabaseUrl = getRequiredEnv("vv_SUPABASE_URL");

    // Server-side secret only.
    const supabaseSecret =
      process.env.vv_SUPABASE_SECRET_KEY ||
      process.env.vv_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseSecret) {
      throw new Error(
        "Missing vv_SUPABASE_SECRET_KEY or vv_SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    const safeFileName = sanitizeFileName(fileName);

    // Every upload gets a unique path so files never overwrite
    // one another accidentally.
    const filePath =
      `resources/${crypto.randomUUID()}-${safeFileName}`;

    const supabase = createClient(
      supabaseUrl,
      supabaseSecret,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create a temporary signed upload URL.
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      console.error(
        "Supabase signed upload URL error:",
        error
      );

      return NextResponse.json(
        {
          error:
            error?.message ||
            "Failed to create Supabase upload URL",
        },
        { status: 500 }
      );
    }

    // This URL is used after the upload finishes as the resource fileKey.
    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      storage: "supabase",
      bucket: SUPABASE_BUCKET,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicUrlData.publicUrl,
      contentType,
      fileName: safeFileName,
    });
  } catch (error) {
    console.error("Upload route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to prepare upload",
      },
      { status: 500 }
    );
  }
}
