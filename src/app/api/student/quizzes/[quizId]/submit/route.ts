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
    const body = await request.json();
    const { attemptId, answers } = body as { attemptId?: string; answers: { questionId: string; selectedOptionId?: string; textAnswer?: string }[] };

    // Fetch quiz with questions and correct options
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        Question: {
          include: { QuestionOption: true },
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

    let attempt;

    if (attemptId) {
      // Update existing attempt
      attempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        include: { Quiz: true },
      });

      if (!attempt || attempt.studentId !== session.user.id || attempt.quizId !== quizId) {
        return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
      }

      if (attempt.submittedAt) {
        return NextResponse.json({ error: "Quiz already submitted" }, { status: 400 });
      }
    } else {
      // Create new attempt
      attempt = await prisma.quizAttempt.create({
        data: {
          id: crypto.randomUUID(),
          quizId,
          studentId: session.user.id,
          startedAt: new Date(),
        },
      });
    }

    // Grade answers
    let totalScore = 0;
    let maxScore = 0;
    const studentAnswersToCreate = [];

    for (const question of quiz.Question) {
      maxScore += question.marks;
      const studentAnswer = answers.find((a) => a.questionId === question.id);

      let isCorrect = false;
      let marksAwarded = 0;

      if (studentAnswer) {
        if (question.type === "MULTIPLE_CHOICE" && studentAnswer.selectedOptionId) {
          const correctOption = question.QuestionOption.find((opt) => opt.isCorrect);
          isCorrect = correctOption?.id === studentAnswer.selectedOptionId;
          marksAwarded = isCorrect ? question.marks : 0;
        } else if ((question.type === "SHORT_ANSWER" || question.type === "ESSAY") && studentAnswer.textAnswer) {
          // Mark for manual grading
          isCorrect = false;
          marksAwarded = 0; // Will be graded manually
        }
      }

      totalScore += marksAwarded;

      studentAnswersToCreate.push({
        id: crypto.randomUUID(),
        attemptId: attempt.id,
        questionId: question.id,
        selectedOptionId: studentAnswer?.selectedOptionId || null,
        textAnswer: studentAnswer?.textAnswer || null,
        isCorrect: question.type === "MULTIPLE_CHOICE" ? isCorrect : null, // null = pending manual grade
        marksAwarded,
      });
    }

    // Save answers
    await prisma.studentAnswer.createMany({ data: studentAnswersToCreate });

    // Update attempt with score
    const hasPendingGrading = quiz.Question.some((q) => q.type !== "MULTIPLE_CHOICE" && answers.find((a) => a.questionId === q.id)?.textAnswer);
    const submittedAt = new Date();

    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        submittedAt,
        score: hasPendingGrading ? null : totalScore, // Null if needs manual grading
        maxScore: hasPendingGrading ? null : maxScore,
      },
    });

    // Clear localStorage
    // Note: Can't clear client localStorage from server, but client will redirect

    return NextResponse.json({
      attempt: {
        id: updatedAttempt.id,
        score: updatedAttempt.score,
        maxScore: updatedAttempt.maxScore,
        submittedAt: updatedAttempt.submittedAt,
        needsManualGrading: hasPendingGrading,
      },
    });
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json({ error: "Failed to submit quiz" }, { status: 500 });
  }
}