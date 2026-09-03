import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { generateQuizWithFallback, getAIProvider } from "@/lib/ai-providers";
import { getSubjectContext, buildIGCSEPrompt } from "@/lib/igcse-prompts";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topicId, questionCount, types, difficulty } = body as {
      topicId: string;
      questionCount: number;
      types: string[];
      difficulty: "core" | "extended" | "mixed";
    };

    if (!topicId || !questionCount || !types || types.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: topicId, questionCount, types" },
        { status: 400 }
      );
    }

    // Validate question count
    if (questionCount < 1 || questionCount > 20) {
      return NextResponse.json(
        { error: "Question count must be between 1 and 20" },
        { status: 400 }
      );
    }

    // Validate types
    const validTypes = ["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"];
    if (!types.every(t => validTypes.includes(t))) {
      return NextResponse.json(
        { error: "Invalid question type. Must be MULTIPLE_CHOICE, SHORT_ANSWER, or ESSAY" },
        { status: 400 }
      );
    }

    // Fetch topic context
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        Unit: {
          include: {
            Subject: true,
          },
        },
      },
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // Build IGCSE context
    const subjectSlug = topic.Unit.Subject.slug.toLowerCase();
    const context = getSubjectContext(subjectSlug, topic.Unit.name, topic.name);

    // Build prompt
    const prompt = buildIGCSEPrompt(context, {
      questionCount,
      types,
      difficulty,
    });

    // Check which provider is available
    let providerName = "unknown";
    try {
      const primaryProvider = getAIProvider();
      providerName = primaryProvider.name;
    } catch (e) {
      // Check fallback
      const primary = process.env.AI_PROVIDER?.toLowerCase() || "gemini";
      if (primary === "gemini" && process.env.DEEPSEEK_API_KEY) {
        providerName = "deepseek (fallback)";
      } else if (primary === "deepseek" && process.env.GEMINI_API_KEY) {
        providerName = "gemini (fallback)";
      }
    }

    // Generate quiz using AI
    const generatedQuiz = await generateQuizWithFallback(prompt, {
      questionCount,
      types: types as ("MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY")[],
      difficulty,
      subject: context.subjectName,
      unit: context.unit,
      topic: context.topic,
    });

    // Validate and transform generated questions to match our schema
    const questions = generatedQuiz.questions.map((q, idx) => ({
      prompt: q.prompt,
      type: q.type,
      marks: q.marks,
      orderIndex: idx,
      options: q.type === "MULTIPLE_CHOICE" && q.options
        ? q.options.map((opt, oIdx) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          }))
        : undefined,
      explanation: q.explanation,
      markScheme: q.markScheme,
    }));

    return NextResponse.json({
      quiz: {
        title: generatedQuiz.title,
        timeLimitSeconds: generatedQuiz.timeLimitSeconds || calculateTimeLimit(questions),
        questions,
      },
      meta: {
        subject: context.subjectName,
        unit: context.unit,
        topic: context.topic,
        difficulty,
        provider: providerName,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("AI quiz generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quiz" },
      { status: 500 }
    );
  }
}

function calculateTimeLimit(questions: { type: string; marks: number }[]): number {
  // Estimate: 1 min per mark for MC, 2 min per mark for SA, 3 min per mark for Essay
  let totalMinutes = 0;
  for (const q of questions) {
    switch (q.type) {
      case "MULTIPLE_CHOICE":
        totalMinutes += q.marks * 1;
        break;
      case "SHORT_ANSWER":
        totalMinutes += q.marks * 2;
        break;
      case "ESSAY":
        totalMinutes += q.marks * 3;
        break;
    }
  }
  // Minimum 10 minutes, add 5 min buffer
  return Math.max(10, totalMinutes + 5) * 60;
}