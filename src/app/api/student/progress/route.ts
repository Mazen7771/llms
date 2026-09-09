import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isSubjectAllowed, nestedSubjectFilter } from "@/lib/subject-filter";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await prisma.progress.findMany({
      where: { studentId: session.user.id, ...(await nestedSubjectFilter(session.user.id)) },
      include: {
        Topic: {
          include: {
            Unit: { include: { Subject: true } },
            Resource: true,
            Recording: true,
            Quiz: { where: { isActive: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Student progress error:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topicId, lessonViewed, recordingWatched, quizCompleted } = body;

    if (!topicId) {
      return NextResponse.json({ error: "Topic ID is required" }, { status: 400 });
    }

    // Guard: student must have access to the subject this topic belongs to.
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { Unit: { include: { Subject: true } } },
    });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }
    const allowed = await isSubjectAllowed(session.user.id, topic.Unit.Subject.slug);
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const existing = await prisma.progress.findUnique({
      where: { studentId_topicId: { studentId: session.user.id, topicId } },
    });

    let progress;
    if (existing) {
      progress = await prisma.progress.update({
        where: { id: existing.id },
        data: {
          lessonViewed: lessonViewed ?? existing.lessonViewed,
          recordingWatched: recordingWatched ?? existing.recordingWatched,
          quizCompleted: quizCompleted ?? existing.quizCompleted,
          updatedAt: new Date(),
        },
      });
    } else {
      progress = await prisma.progress.create({
        data: {
          id: crypto.randomUUID(),
          studentId: session.user.id,
          topicId,
          lessonViewed: lessonViewed ?? false,
          recordingWatched: recordingWatched ?? false,
          quizCompleted: quizCompleted ?? false,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Update progress error:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}