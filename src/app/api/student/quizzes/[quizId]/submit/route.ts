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
    const { answers } = body as {
      answers: Array<{
        questionId: string;
        selectedOptionId?: string | null;
        textAnswer?: string | null;
      }>;
    };

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Answers array is required" }, { status: 400 });
    }

    // Find the existing in-progress attempt
    const attempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId: session.user.id } },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "No in-progress attempt found. Start the quiz first." },
        { status: 400 }
      );
    }

    if (attempt.submittedAt) {
      return NextResponse.json({ error: "Quiz already submitted" }, { status: 400 });
    }

    // Load questions with their correct options for grading
    const questions = await prisma.question.findMany({
      where: { quizId },
      include: { QuestionOption: true },
    });

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    let score = 0;
    let maxScore = 0;

    // Grade and save each answer
    const answerData = [];
    for (const a of answers) {
      const question = questionMap.get(a.questionId);
      if (!question) continue;

      maxScore += question.marks;

      let isCorrect = false;
      let marksAwarded = 0;

      if (question.type === "MULTIPLE_CHOICE" && a.selectedOptionId) {
        const correctOption = question.QuestionOption.find((o) => o.isCorrect);
        isCorrect = correctOption?.id === a.selectedOptionId;
      } else if (question.type === "SHORT_ANSWER" && a.textAnswer) {
        // For short answer, check against any correct option text (case-insensitive)
        const correctOption = question.QuestionOption.find((o) => o.isCorrect);
        if (correctOption) {
          isCorrect =
            a.textAnswer.trim().toLowerCase() === correctOption.text.trim().toLowerCase();
        }
      }
      // ESSAY: not auto-graded, isCorrect stays null

      if (isCorrect) {
        marksAwarded = question.marks;
        score += question.marks;
      }

      answerData.push({
        id: crypto.randomUUID(),
        attemptId: attempt.id,
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId ?? null,
        textAnswer: a.textAnswer ?? null,
        isCorrect: question.type === "ESSAY" ? null : isCorrect,
        marksAwarded,
      });
    }

    // Batch insert answers and update attempt in a transaction
    await prisma.$transaction([
      prisma.studentAnswer.createMany({ data: answerData }),
      prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          submittedAt: new Date(),
          score,
          maxScore,
        },
      }),
    ]);

    // Update student progress for the quiz's topic
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { topicId: true },
    });

    if (quiz) {
      // Check if student has passed (score >= 50% of maxScore)
      const passed = maxScore > 0 && score / maxScore >= 0.5;

      await prisma.progress.upsert({
        where: { studentId_topicId: { studentId: session.user.id, topicId: quiz.topicId } },
        update: {
          quizCompleted: passed ? true : undefined,
          updatedAt: new Date(),
        },
        create: {
          id: crypto.randomUUID(),
          studentId: session.user.id,
          topicId: quiz.topicId,
          lessonViewed: false,
          recordingWatched: false,
          quizCompleted: passed,
          updatedAt: new Date(),
        },
      });
    }

    // Fetch the full results with correct answers
    const results = await prisma.studentAnswer.findMany({
      where: { attemptId: attempt.id },
      include: {
        Question: {
          include: { QuestionOption: true },
        },
      },
    });

    return NextResponse.json({
      attemptId: attempt.id,
      score,
      maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      answers: results.map((a) => ({
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
    console.error("Submit quiz error:", error);
    return NextResponse.json({ error: "Failed to submit quiz" }, { status: 500 });
  }
}
