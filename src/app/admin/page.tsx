import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const SUPABASE_BUCKET = "new-files";
const MAX_FILE_SIZE = 100 * 1024 * 1024;

function requiredEnv(name: string): string {
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
      typeof body.contentType === "string" && body.contentType.trim()
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

    const supabaseUrl = requiredEnv("vv_SUPABASE_URL");

    const supabaseSecret =
      process.env.vv_SUPABASE_SECRET_KEY ||
      process.env.vv_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseSecret) {
      throw new Error(
        "Missing vv_SUPABASE_SECRET_KEY or vv_SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    const safeFileName = sanitizeFileName(fileName);

    const filePath =
      `resources/${crypto.randomUUID()}-${safeFileName}`;

    const storageBaseUrl =
      `${supabaseUrl.replace(/\/+$/, "")}/storage/v1`;

    const signUrl =
      `${storageBaseUrl}/object/upload/sign/${SUPABASE_BUCKET}/${filePath}`;

    const signResponse = await fetch(signUrl, {
      method: "POST",
      headers: {
        apikey: supabaseSecret,
        Authorization: `Bearer ${supabaseSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    const signData = await signResponse.json().catch(() => null);

    if (!signResponse.ok) {
      console.error(
        "Supabase signed upload error:",
        signData
      );

      return NextResponse.json(
        {
          error:
            signData?.message ||
            signData?.error ||
            "Failed to create Supabase upload URL",
        },
        { status: 500 }
      );
    }

    if (!signData?.url) {
      console.error(
        "Supabase did not return a signed upload URL:",
        signData
      );

      return NextResponse.json(
        {
          error:
            "Supabase did not return a signed upload URL",
        },
        { status: 500 }
      );
    }

    const signedUrl = signData.url.startsWith("http")
      ? signData.url
      : `${storageBaseUrl}${signData.url}`;

    const signedUrlObject = new URL(signedUrl);

    const token =
      signedUrlObject.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Supabase signed upload URL did not contain a token",
        },
        { status: 500 }
      );
    }

    const publicUrl =
      `${storageBaseUrl}/object/public/${SUPABASE_BUCKET}/${filePath}`;

    return NextResponse.json({
      success: true,
      storage: "supabase",
      bucket: SUPABASE_BUCKET,
      path: filePath,
      token,
      signedUrl,
      publicUrl,
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
