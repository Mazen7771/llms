import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isSubjectAllowed } from "@/lib/subject-filter";

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

    // Guard: student must have access to the subject this quiz belongs to
    // (defense in depth — the attempt itself is already scoped to the student).
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { Topic: { include: { Unit: { include: { Subject: true } } } } },
    });
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    const allowed = await isSubjectAllowed(session.user.id, quiz.Topic.Unit.Subject.slug);
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
