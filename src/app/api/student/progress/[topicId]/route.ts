import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        Unit: { include: { Subject: true } },
        Quiz: { where: { isActive: true }, include: { Question: true, _count: { select: { QuizAttempt: true } } } },
        Resource: true,
        Recording: true,
      },
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const progress = await prisma.progress.findUnique({
      where: { studentId_topicId: { studentId: session.user.id, topicId } },
    });

    // Get quiz IDs for this topic first
    const quizzesInTopic = await prisma.quiz.findMany({
      where: { topicId },
      select: { id: true },
    });
    const quizIds = quizzesInTopic.map(q => q.id);

    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { studentId: session.user.id, quizId: { in: quizIds } },
      include: { Quiz: true },
    });

    return NextResponse.json({
      topic,
      progress,
      quizAttempts,
    });
  } catch (error) {
    console.error("Get topic progress error:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;
    const body = await request.json();
    const { lessonViewed, recordingWatched, quizCompleted } = body;

    const progress = await prisma.progress.upsert({
      where: { studentId_topicId: { studentId: session.user.id, topicId } },
      update: {
        lessonViewed: lessonViewed ?? false,
        recordingWatched: recordingWatched ?? false,
        quizCompleted: quizCompleted ?? false,
        updatedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        studentId: session.user.id,
        topicId,
        lessonViewed: lessonViewed ?? false,
        recordingWatched: recordingWatched ?? false,
        quizCompleted: quizCompleted ?? false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Update progress error:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}