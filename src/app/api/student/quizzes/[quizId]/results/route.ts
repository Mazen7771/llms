import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get("attemptId");

    // Fetch quiz with questions and options
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        Topic: {
          include: {
            Unit: {
              include: {
                Subject: true,
              },
            },
          },
        },
        Question: {
          include: { QuestionOption: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Find the attempt
    let attempt;
    if (attemptId) {
      attempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
      });

      if (!attempt || attempt.studentId !== session.user.id || attempt.quizId !== quizId) {
        return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
      }
    } else {
      // Get latest attempt
      attempt = await prisma.quizAttempt.findFirst({
        where: { studentId: session.user.id, quizId },
        orderBy: { startedAt: "desc" },
      });

      if (!attempt) {
        return NextResponse.json({ error: "No attempt found" }, { status: 404 });
      }
    }

    // Fetch student answers for this attempt
    const studentAnswers = await prisma.studentAnswer.findMany({
      where: { attemptId: attempt.id },
    });

    return NextResponse.json({
      quiz,
      attempt,
      answers: studentAnswers,
    });
  } catch (error) {
    console.error("Quiz results error:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}