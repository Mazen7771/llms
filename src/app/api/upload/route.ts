import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const SUPABASE_BUCKET = "new-files";
const FALLBACK_CONTENT_TYPE = "application/octet-stream";

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
    // Keep the existing teacher-only authorization.
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabaseUrl = requiredEnv("vv_SUPABASE_URL");

    // Server-side secret only.
    const supabaseSecret =
      process.env.vv_SUPABASE_SECRET_KEY ||
      process.env.vv_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseSecret) {
      throw new Error(
        "Missing vv_SUPABASE_SECRET_KEY or vv_SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    const formData = await request.formData();
    const fileValue = formData.get("file");

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const file = fileValue;
    const contentType =
      file.type || FALLBACK_CONTENT_TYPE;

    const safeFileName = sanitizeFileName(file.name);

    // Every new file gets its own unique path.
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

    const bytes = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filePath, bytes, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error || !data) {
      console.error("Supabase Storage upload error:", error);

      return NextResponse.json(
        {
          error:
            error?.message ||
            "Failed to upload file to Supabase Storage",
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(data.path);

    const publicUrl = publicUrlData.publicUrl;

    console.log(
      `Upload complete (Supabase): ${file.name} ` +
      `(${(file.size / 1024 / 1024).toFixed(1)}MB) → ${publicUrl}`
    );

    return NextResponse.json({
      fileKey: publicUrl,
      fileType: contentType,
      fileSize: file.size,
      url: publicUrl,
      pathname: data.path,
      storage: "supabase",
    });
  } catch (error) {
    console.error("File upload error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload file",
      },
      { status: 500 }
    );
  }
}
