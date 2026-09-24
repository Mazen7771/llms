import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const SUPABASE_BUCKET_DEFAULT = "new-files";
const SUPABASE_BUCKET_BY_SUBJECT: Record<string, string> = {
  CHEMISTRY: "chemistry",
};
// Biology uploads go to Neon's S3-compatible branchable object storage
// instead of Supabase, because Supabase's standard upload endpoint caps
// individual files at 50MB and several Biology resources exceed that.
const NEON_STORAGE_SUBJECTS = new Set(["BIOLOGY"]);
const NEON_STORAGE_BUCKET = "biology";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

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
    // Existing authentication behavior: only teachers can upload.
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

    // Which subject this upload belongs to determines which storage
    // location it goes to. Falls back to the original shared Supabase
    // bucket for anything that isn't Chemistry or Biology (or when the
    // caller doesn't send it), so this stays backward-compatible.
    const subjectInput =
      typeof body.subject === "string"
        ? body.subject.trim().toUpperCase()
        : "";

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

    const safeFileName = sanitizeFileName(fileName);

    // Unique path for every upload.
    const filePath =
      `resources/${crypto.randomUUID()}-${safeFileName}`;

    if (NEON_STORAGE_SUBJECTS.has(subjectInput)) {
      const endpoint = requiredEnv("NEON_STORAGE_ENDPOINT");
      const region = requiredEnv("NEON_STORAGE_REGION");
      const accessKeyId = requiredEnv(
        "NEON_STORAGE_ACCESS_KEY_ID"
      );
      const secretAccessKey = requiredEnv(
        "NEON_STORAGE_SECRET_ACCESS_KEY"
      );

      const s3Client = new S3Client({
        endpoint,
        region,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
      });

      const command = new PutObjectCommand({
        Bucket: NEON_STORAGE_BUCKET,
        Key: filePath,
        ContentType: contentType,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 900,
      });

      const publicUrl = `${endpoint.replace(/\/+$/, "")}/${NEON_STORAGE_BUCKET}/${filePath}`;

      return NextResponse.json({
        success: true,
        storage: "neon",
        uploadMethod: "s3",
        bucket: NEON_STORAGE_BUCKET,
        path: filePath,
        signedUrl,
        publicUrl,
        contentType,
        fileName: safeFileName,
      });
    }

    const SUPABASE_BUCKET =
      SUPABASE_BUCKET_BY_SUBJECT[subjectInput] ||
      SUPABASE_BUCKET_DEFAULT;

    const supabaseUrl = requiredEnv("vv_SUPABASE_URL");

    // Server-side only.
    const supabaseSecret =
      process.env.vv_SUPABASE_SECRET_KEY ||
      process.env.vv_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseSecret) {
      throw new Error(
        "Missing vv_SUPABASE_SECRET_KEY or vv_SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    /*
     * Supabase Storage API:
     * POST /storage/v1/object/upload/sign/{bucket}/{path}
     *
     * This is the same Storage endpoint used by
     * @supabase/supabase-js internally.
     */
    const storageBaseUrl =
      `${supabaseUrl.replace(/\/+$/, "")}/storage/v1`;

    const signUrl =
      `${storageBaseUrl}/object/upload/sign/` +
      `${SUPABASE_BUCKET}/${filePath}`;

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

    const signData = await signResponse
      .json()
      .catch(() => null);

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

    // Supabase returns a relative URL such as:
    // /object/upload/sign/new-files/resources/...?token=...
    const signedUrl = signData.url.startsWith("http")
      ? signData.url
      : `${storageBaseUrl}${signData.url}`;

    const signedUrlObject = new URL(signedUrl);
    const token =
      signedUrlObject.searchParams.get("token");

    if (!token) {
      console.error(
        "No token found in Supabase signed URL"
      );

      return NextResponse.json(
        {
          error:
            "Supabase signed upload URL did not contain a token",
        },
        { status: 500 }
      );
    }

    // Public URL for the final resource record.
    const publicUrl =
      `${storageBaseUrl}/object/public/` +
      `${SUPABASE_BUCKET}/${filePath}`;

    return NextResponse.json({
      success: true,
      storage: "supabase",
      uploadMethod: "supabase",
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
