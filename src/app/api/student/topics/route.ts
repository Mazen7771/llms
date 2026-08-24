import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get("unitId");
    const topicId = searchParams.get("topicId");

    if (topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId },
        include: {
          Unit: { include: { Subject: true } },
          Resource: { orderBy: { createdAt: "desc" } },
          Recording: { orderBy: { createdAt: "desc" } },
          Quiz: {
            where: { isActive: true },
            include: { Question: { include: { QuestionOption: true } } },
          },
          Progress: { where: { studentId: session.user.id } },
        },
      });

      if (!topic) {
        return NextResponse.json({ error: "Topic not found" }, { status: 404 });
      }

      return NextResponse.json({ topic });
    }

    if (unitId) {
      const topics = await prisma.topic.findMany({
        where: { unitId },
        orderBy: { orderIndex: "asc" },
        include: {
          Resource: { take: 3, orderBy: { createdAt: "desc" } },
          Recording: { take: 3, orderBy: { createdAt: "desc" } },
          Quiz: { where: { isActive: true } },
          Progress: { where: { studentId: session.user.id } },
        },
      });

      return NextResponse.json({ topics });
    }

    return NextResponse.json({ error: "Unit ID or Topic ID required" }, { status: 400 });
  } catch (error) {
    console.error("Student topics error:", error);
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
  }
}