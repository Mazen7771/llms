import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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

    // Prefer Vercel Blob when it's configured on the deployment; otherwise
    // store the raw bytes in the UploadedFile table so uploads work even
    // without a BLOB_READ_WRITE_TOKEN (Blob not attached to the project).
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(file.name, file, {
        access: "public",
        addRandomSuffix: true,
      });

      // Return file info for the resources API
      return NextResponse.json({
        fileKey: blob.url, // Using the blob URL as fileKey
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        url: blob.url,
        pathname: blob.pathname,
      });
    }

    // Fallback: persist the bytes in the DB and return the row key as
    // fileKey. /api/files/[...path] serves these bytes back for the key.
    const bytes = Buffer.from(await file.arrayBuffer());
    const key = crypto.randomUUID();
    await prisma.uploadedFile.create({
      data: {
        key,
        data: bytes,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      },
    });

    return NextResponse.json({
      fileKey: key,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      url: key,
      pathname: file.name,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}