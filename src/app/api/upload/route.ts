import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const topicId = formData.get("topicId") as string | null;
    const type = formData.get("type") as string | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!topicId || !type || !title) {
      return NextResponse.json({ error: "Missing required fields: topicId, type, title" }, { status: 400 });
    }

    // Validate resource type
    const validTypes = ["LESSON", "NOTE", "WORKSHEET", "SAVE_MY_EXAM", "RESOURCE"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
    }

    // Upload to Vercel Blob
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
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}