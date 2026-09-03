import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        Topic: { include: { Unit: { include: { Subject: true } } } },
        Question: {
          orderBy: { orderIndex: "asc" },
          include: { QuestionOption: true },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("Get quiz error:", error);
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, timeLimitSeconds, questions } = body as {
      title: string;
      timeLimitSeconds?: number | null;
      questions?: Array<{
        prompt: string;
        type: string;
        marks?: number;
        orderIndex?: number;
        options?: Array<{ text: string; isCorrect?: boolean }>;
      }>;
    };

    await prisma.quiz.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        timeLimitSeconds: timeLimitSeconds !== undefined ? timeLimitSeconds : undefined,
      },
    });

    if (questions) {
      await prisma.questionOption.deleteMany({
        where: { Question: { quizId: id } },
      });
      await prisma.question.deleteMany({
        where: { quizId: id },
      });

      for (const q of questions) {
        await prisma.question.create({
          data: {
            id: crypto.randomUUID(),
            quizId: id,
            prompt: q.prompt,
            type: (q.type ?? "MULTIPLE_CHOICE") as "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY",
            marks: q.marks ?? 1,
            orderIndex: q.orderIndex ?? 0,
            updatedAt: new Date(),
            QuestionOption: q.options?.length
              ? {
                  create: q.options.map((o) => ({
                    id: crypto.randomUUID(),
                    text: o.text,
                    isCorrect: o.isCorrect ?? false,
                  })),
                }
              : undefined,
          },
        });
      }
    }

    const updated = await prisma.quiz.findUnique({
      where: { id },
      include: { Question: { include: { QuestionOption: true } } },
    });

    return NextResponse.json({ quiz: updated });
  } catch (error) {
    console.error("Update quiz error:", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.title ? { title: body.title } : {}),
        ...(body.timeLimitSeconds !== undefined ? { timeLimitSeconds: body.timeLimitSeconds } : {}),
      },
    });

    return NextResponse.json({ quiz: updated });
  } catch (error) {
    console.error("Patch quiz error:", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.questionOption.deleteMany({
      where: { Question: { quizId: id } },
    });
    await prisma.question.deleteMany({
      where: { quizId: id },
    });
    await prisma.quiz.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete quiz error:", error);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}
