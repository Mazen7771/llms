import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");

    const where = topicId ? { topicId } : {};

    const quizzes = await prisma.quiz.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        Topic: { include: { Unit: { include: { Subject: true } } } },
        _count: { select: { Question: true, QuizAttempt: true } },
      },
    });

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error("Admin quizzes error:", error);
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  }
}

interface IncomingQuestion {
  prompt: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";
  marks?: number;
  options?: Array<{ text: string; isCorrect?: boolean }>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topicId, title, timeLimitSeconds, isActive, questions } = body as {
      topicId: string;
      title: string;
      timeLimitSeconds?: number | null;
      isActive?: boolean;
      questions?: IncomingQuestion[];
    };

    if (!topicId || !title) {
      return NextResponse.json({ error: "topicId and title are required" }, { status: 400 });
    }

    const quiz = await prisma.quiz.create({
      data: {
        id: crypto.randomUUID(),
        topicId,
        title,
        timeLimitSeconds: timeLimitSeconds ?? null,
        isActive: isActive ?? true,
        createdById: session.user.id,
        updatedAt: new Date(),
        Question: questions?.length
          ? {
              create: questions.map((q, i) => ({
                id: crypto.randomUUID(),
                prompt: q.prompt,
                type: q.type ?? "MULTIPLE_CHOICE",
                marks: q.marks ?? 1,
                orderIndex: i,
                updatedAt: new Date(),
                QuestionOption:
                  q.options?.length
                    ? { create: q.options.map((o) => ({ id: crypto.randomUUID(), text: o.text, isCorrect: o.isCorrect ?? false })) }
                    : undefined,
              })),
            }
          : undefined,
      },
      include: { Question: { include: { QuestionOption: true } } },
    });

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error("Create quiz error:", error);
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}
