import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { buildPublicUrl } from "@/lib/upload";
import { buildPlayerUrl } from "@/lib/cloudflare-stream";
import { isSubjectAllowed } from "@/lib/subject-filter";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId");
    const topicId = searchParams.get("topicId");

    if (topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId },
        include: {
          Unit: { include: { Subject: true } },
          Resource: { orderBy: { createdAt: "desc" } },
          Recording: { orderBy: { createdAt: "desc" } },
          Quiz: {
            where: { isActive: true },
            include: { Question: { include: { QuestionOption: true } } },
          },
          Progress: { where: { studentId: session.user.id } },
        },
      });

      if (!topic) {
        return NextResponse.json({ error: "Topic not found" }, { status: 404 });
      }

      // Guard: student must have access to the subject this topic belongs to.
      const allowed = await isSubjectAllowed(session.user.id, topic.Unit.Subject.slug);
      if (!allowed) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const enrichedTopic = {
        ...topic,
        Resource: topic.Resource.map((r) => ({
          ...r,
          publicUrl: buildPublicUrl(r.fileKey),
        })),
        Recording: topic.Recording.map((rec) => ({
          ...rec,
          playerUrl: buildPlayerUrl(rec.streamVideoId),
        })),
      };

      return NextResponse.json({ topic: enrichedTopic });
    }

    if (unitId) {
      // Guard: student must have access to the subject this unit belongs to.
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        include: { Subject: true },
      });
      if (!unit) {
        return NextResponse.json({ error: "Unit not found" }, { status: 404 });
      }
      const unitAllowed = await isSubjectAllowed(session.user.id, unit.Subject.slug);
      if (!unitAllowed) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const topics = await prisma.topic.findMany({
        where: { unitId },
        orderBy: { orderIndex: "asc" },
        include: {
          Resource: { take: 3, orderBy: { createdAt: "desc" } },
          Recording: { take: 3, orderBy: { createdAt: "desc" } },
          Quiz: { where: { isActive: true } },
          Progress: { where: { studentId: session.user.id } },
        },
      });

      const enrichedTopics = topics.map((t) => ({
        ...t,
        Resource: t.Resource.map((r) => ({
          ...r,
          publicUrl: buildPublicUrl(r.fileKey),
        })),
        Recording: t.Recording.map((rec) => ({
          ...rec,
          playerUrl: buildPlayerUrl(rec.streamVideoId),
        })),
      }));

      return NextResponse.json({ topics: enrichedTopics });
    }

    return NextResponse.json({ error: "Unit ID or Topic ID required" }, { status: 400 });
  } catch (error) {
    console.error("Student topics error:", error);
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
  }
}