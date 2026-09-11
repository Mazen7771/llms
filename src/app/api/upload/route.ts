import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const FALLBACK_CONTENT_TYPE = "application/octet-stream";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // NOTE: The client (page.tsx) now uploads ALL files directly to Vercel Blob
    // via a scoped client token (multipart). This server endpoint is only reached
    // for small files (<=2MB) when the Blob token is unavailable, OR if someone
    // calls it directly. The old chunked path (key/index/total/finalize) that
    // wrote to Neon's UploadChunk table has been REMOVED — it was a capacity
    // bomb for the free-tier DB and is no longer used.
    return await handleWholeFile(file);
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

async function handleWholeFile(file: File): Promise<NextResponse> {
  const contentType = file.type || FALLBACK_CONTENT_TYPE;

  // Prefer Vercel Blob when it's configured on the deployment; otherwise
  // store the raw bytes in the UploadedFile table so uploads work even
  // without a BLOB_READ_WRITE_TOKEN (Blob not attached to the project).
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });

    console.log(`Upload complete (blob): ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) → ${blob.url}`);

    return NextResponse.json({
      fileKey: blob.url, // Using the blob URL as fileKey
      fileType: contentType,
      fileSize: file.size,
      url: blob.url,
      pathname: blob.pathname,
    });
  }

  // Fallback: persist the bytes in the DB and return the row key as fileKey.
  // /api/files/[...path] serves these bytes back for the key.
  const bytes = Buffer.from(await file.arrayBuffer());
  const key = crypto.randomUUID();
  await prisma.uploadedFile.create({
    data: { key: key, data: bytes, contentType: contentType, size: bytes.length },
  });

  console.log(`Upload complete (db): ${file.name} (${(bytes.length / 1024 / 1024).toFixed(1)}MB) → ${key}`);

  return NextResponse.json({
    fileKey: key,
    fileType: contentType,
    fileSize: bytes.length,
    url: key,
    pathname: file.name,
  });
}