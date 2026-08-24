import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { Question: { orderBy: { orderIndex: "asc" }, include: { QuestionOption: true } } },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (!quiz.isActive) {
      return NextResponse.json({ error: "Quiz is not active" }, { status: 400 });
    }

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

    return NextResponse.json({ attempt, quiz: sanitizedQuiz });
  } catch (error) {
    console.error("Start quiz error:", error);
    return NextResponse.json({ error: "Failed to start quiz" }, { status: 500 });
  }
}