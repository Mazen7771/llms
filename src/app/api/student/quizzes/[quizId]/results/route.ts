import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId: session.user.id } },
    });

    if (!attempt) {
      return NextResponse.json({ error: "No attempt found" }, { status: 404 });
    }

    if (!attempt.submittedAt) {
      return NextResponse.json({ error: "Quiz not yet submitted" }, { status: 400 });
    }

    const answers = await prisma.studentAnswer.findMany({
      where: { attemptId: attempt.id },
      include: {
        Question: {
          include: { QuestionOption: true },
        },
      },
    });

    return NextResponse.json({
      attemptId: attempt.id,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.maxScore && attempt.maxScore > 0
        ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)
        : 0,
      submittedAt: attempt.submittedAt,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        prompt: a.Question.prompt,
        type: a.Question.type,
        selectedOptionId: a.selectedOptionId,
        textAnswer: a.textAnswer,
        isCorrect: a.isCorrect,
        marksAwarded: a.marksAwarded,
        correctOptionId: a.Question.QuestionOption.find((o) => o.isCorrect)?.id ?? null,
        options: a.Question.QuestionOption.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      })),
    });
  } catch (error) {
    console.error("Quiz results error:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
