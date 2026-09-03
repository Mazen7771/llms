import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { buildPublicUrl } from "@/lib/upload";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");

    const where = topicId ? { topicId } : {};

    const resources = await prisma.resource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        Topic: { include: { Unit: { include: { Subject: true } } } },
      },
    });

    const withUrls = resources.map((r) => ({
      ...r,
      publicUrl: buildPublicUrl(r.fileKey),
    }));

    return NextResponse.json({ resources: withUrls });
  } catch (error) {
    console.error("Admin resources error:", error);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topicId, type, title, description, fileKey, fileType, fileSize } = body;

    if (!topicId || !type || !title || !fileKey || !fileType || fileSize === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate resource type matches the allowed set.
    const validTypes = ["LESSON", "NOTE", "WORKSHEET", "SAVE_MY_EXAM", "RESOURCE"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
    }

    // Ensure the topic actually exists before creating the record.
    const topic = await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    try {
      const resource = await prisma.resource.create({
        data: {
          id: crypto.randomUUID(),
          topicId,
          type,
          title,
          description,
          fileKey,
          fileType,
          fileSize,
          uploadedById: session.user.id,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ resource });
    } catch (error) {
      // If the DB record fails after the file was uploaded, delete the blob
      // so it doesn't become an orphaned file with no database reference.
      try {
        const { del } = await import("@vercel/blob");
        if (fileKey && typeof fileKey === "string" && fileKey.startsWith("https://")) {
          await del(fileKey);
        }
      } catch {
        // Cleanup is best-effort; the metadata error is the primary signal.
      }
      throw error;
    }
  } catch (error) {
    console.error("Create resource error:", error);
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, fileKey, fileType, fileSize, type } = body;

    if (!id) {
      return NextResponse.json({ error: "Resource ID is required" }, { status: 400 });
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: { title, description, fileKey, fileType, fileSize, type, updatedAt: new Date() },
    });

    return NextResponse.json({ resource });
  } catch (error) {
    console.error("Update resource error:", error);
    return NextResponse.json({ error: "Failed to update resource" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Resource ID is required" }, { status: 400 });
    }

    const resource = await prisma.resource.findUnique({ where: { id }, select: { fileKey: true } });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    await prisma.resource.delete({ where: { id } });

    // Also remove the underlying blob so storage doesn't leak files.
    try {
      const { del } = await import("@vercel/blob");
      if (resource.fileKey?.startsWith("https://")) {
        await del(resource.fileKey);
      }
    } catch {
      // Best-effort cleanup; deletion already succeeded.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete resource error:", error);
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
  }
}