import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateQuiz } from "@/lib/ai-provider";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topicName, subjectName, unitName, questionCount, questionTypes, difficulty } = body as {
      topicName: string;
      subjectName: string;
      unitName: string;
      questionCount?: number;
      questionTypes?: string[];
      difficulty?: string;
    };

    if (!topicName || !subjectName || !unitName) {
      return NextResponse.json(
        { error: "topicName, subjectName, and unitName are required" },
        { status: 400 }
      );
    }

    const result = await generateQuiz({
      topicName,
      subjectName,
      unitName,
      questionCount: questionCount ?? 10,
      questionTypes: questionTypes ?? ["MULTIPLE_CHOICE"],
      difficulty: (difficulty as "easy" | "medium" | "hard" | "mixed") ?? "mixed",
    });

    return NextResponse.json({
      questions: result.questions,
      model: result.model,
    });
  } catch (error) {
    console.error("AI quiz generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate quiz. Check that GEMINI_API_KEY is set.",
      },
      { status: 500 }
    );
  }
}
