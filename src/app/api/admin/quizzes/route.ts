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
        Question: { orderBy: { orderIndex: "asc" }, include: { QuestionOption: true } },
      },
    });

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error("Admin quizzes error:", error);
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topicId, title, timeLimitSeconds, questions } = body;

    if (!topicId || !title) {
      return NextResponse.json({ error: "Topic ID and title are required" }, { status: 400 });
    }

    const quiz = await prisma.quiz.create({
      data: {
        id: crypto.randomUUID(),
        topicId,
        title,
        timeLimitSeconds,
        isActive: true,
        createdById: session.user.id,
        updatedAt: new Date(),
        Question: questions
          ? {
              create: questions.map((q: any, idx: number) => ({
                id: crypto.randomUUID(),
                prompt: q.prompt,
                type: q.type || "MULTIPLE_CHOICE",
                marks: q.marks || 1,
                orderIndex: idx,
                QuestionOption: q.options
                  ? {
                      create: q.options.map((opt: any, oIdx: number) => ({
                        id: crypto.randomUUID(),
                        text: opt.text,
                        isCorrect: opt.isCorrect || false,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        Question: { include: { QuestionOption: true } },
      },
    });

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("Create quiz error:", error);
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, timeLimitSeconds, isActive, questions } = body;

    if (!id) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }

    // Update quiz basic info
    const quiz = await prisma.quiz.update({
      where: { id },
      data: { title, timeLimitSeconds, isActive, updatedAt: new Date() },
    });

    // If questions provided, replace them
    if (questions) {
      // Delete existing questions and options
      await prisma.questionOption.deleteMany({
        where: { Question: { quizId: id } },
      });
      await prisma.question.deleteMany({ where: { quizId: id } });

      // Create new questions
      await prisma.question.createMany({
        data: questions.map((q: any, idx: number) => ({
          id: crypto.randomUUID(),
          quizId: id,
          prompt: q.prompt,
          type: q.type || "MULTIPLE_CHOICE",
          marks: q.marks || 1,
          orderIndex: idx,
        })),
      });

      // Create options for each question
      for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];
        if (q.options && q.options.length > 0) {
          const question = await prisma.question.findFirst({
            where: { quizId: id, orderIndex: idx },
          });
          if (question) {
            await prisma.questionOption.createMany({
              data: q.options.map((opt: any, oIdx: number) => ({
                id: crypto.randomUUID(),
                questionId: question.id,
                text: opt.text,
                isCorrect: opt.isCorrect || false,
              })),
            });
          }
        }
      }
    }

    const updatedQuiz = await prisma.quiz.findUnique({
      where: { id },
      include: { Question: { include: { QuestionOption: true }, orderBy: { orderIndex: "asc" } } },
    });

    return NextResponse.json({ quiz: updatedQuiz });
  } catch (error) {
    console.error("Update quiz error:", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
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
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }

    await prisma.quiz.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete quiz error:", error);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}