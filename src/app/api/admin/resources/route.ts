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
    console.error("Create resource error:", error);
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}