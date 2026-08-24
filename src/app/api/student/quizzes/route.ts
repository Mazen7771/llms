import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");
    const quizId = searchParams.get("quizId");

    if (quizId) {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          Question: {
            orderBy: { orderIndex: "asc" },
            include: { QuestionOption: { orderBy: { createdAt: "asc" } } },
          },
          Topic: { include: { Unit: { include: { Subject: true } } } },
          QuizAttempt: { where: { studentId: session.user.id }, orderBy: { startedAt: "desc" } },
        },
      });

      if (!quiz) {
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
      }

      // Remove correct answers for active quizzes
      const sanitizedQuiz = {
        ...quiz,
        Question: quiz.Question.map((q) => ({
          ...q,
          QuestionOption: q.QuestionOption.map((opt) => ({
            id: opt.id,
            text: opt.text,
          })),
        })),
      };

      return NextResponse.json({ quiz: sanitizedQuiz });
    }

    const where: any = { isActive: true };
    if (topicId) where.topicId = topicId;

    const quizzes = await prisma.quiz.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        Topic: { include: { Unit: { include: { Subject: true } } } },
        _count: { select: { Question: true, QuizAttempt: true } },
        QuizAttempt: { where: { studentId: session.user.id } },
      },
    });

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error("Student quizzes error:", error);
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { quizId } = body;

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { Question: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (!quiz.isActive) {
      return NextResponse.json({ error: "Quiz is not active" }, { status: 400 });
    }

    // Check if already attempted
    const existingAttempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId: session.user.id } },
    });

    if (existingAttempt) {
      return NextResponse.json({ error: "Quiz already attempted" }, { status: 400 });
    }

    const attempt = await prisma.quizAttempt.create({
      data: {
        id: crypto.randomUUID(),
        quizId,
        studentId: session.user.id,
      },
    });

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Start quiz error:", error);
    return NextResponse.json({ error: "Failed to start quiz" }, { status: 500 });
  }
}