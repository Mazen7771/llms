import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * Load an in-progress quiz attempt so a student can resume it after
 * navigating away. Returns the saved answers for the quiz.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId, attemptId } = await params;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { StudentAnswer: true },
    });

    if (!attempt || attempt.studentId !== session.user.id || attempt.quizId !== quizId) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.submittedAt) {
      return NextResponse.json({ error: "Quiz already submitted" }, { status: 400 });
    }

    const answers = attempt.StudentAnswer.map((a) => ({
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId || undefined,
      textAnswer: a.textAnswer || undefined,
    }));

    return NextResponse.json({ attempt, answers });
  } catch (error) {
    console.error("Get attempt error:", error);
    return NextResponse.json({ error: "Failed to load attempt" }, { status: 500 });
  }
}
