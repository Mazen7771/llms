import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { buildPlayerUrl } from "@/lib/cloudflare-stream";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");

    const where = topicId ? { topicId } : {};

    const recordings = await prisma.recording.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        Topic: { include: { Unit: { include: { Subject: true } } } },
      },
    });

    const withUrls = recordings.map((rec) => ({
      ...rec,
      playerUrl: buildPlayerUrl(rec.streamVideoId),
    }));

    return NextResponse.json({ recordings: withUrls });
  } catch (error) {
    console.error("Admin recordings error:", error);
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topicId, title, description, streamVideoId, durationSeconds, recordedDate } = body;

    if (!topicId || !title || !streamVideoId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.recording.findUnique({ where: { streamVideoId } });
    if (existing) {
      return NextResponse.json({ error: "Recording with this Stream ID already exists" }, { status: 400 });
    }

    const recording = await prisma.recording.create({
      data: {
        id: crypto.randomUUID(),
        topicId,
        title,
        description,
        streamVideoId,
        durationSeconds,
        recordedDate: recordedDate ? new Date(recordedDate) : null,
        uploadedById: session.user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ recording });
  } catch (error) {
    console.error("Create recording error:", error);
    return NextResponse.json({ error: "Failed to create recording" }, { status: 500 });
  }
}