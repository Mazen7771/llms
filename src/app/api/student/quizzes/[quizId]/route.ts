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

    // Fetch quiz with questions and options (but don't reveal correct answers for MC)
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
          include: {
            QuestionOption: {
              // Don't include isCorrect for students taking the quiz
              select: { id: true, text: true },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (!quiz.isActive) {
      return NextResponse.json({ error: "Quiz is not active" }, { status: 400 });
    }

    // Check if student has an existing incomplete attempt
    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: {
        studentId: session.user.id,
        quizId,
        submittedAt: null,
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({
      quiz,
      attempt: existingAttempt,
    });
  } catch (error) {
    console.error("Student quiz fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }
}