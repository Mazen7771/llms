import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all subjects with units and topics
    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        Unit: {
          orderBy: { orderIndex: "asc" },
          include: {
            Topic: {
              orderBy: { orderIndex: "asc" },
              include: {
                Resource: { orderBy: { createdAt: "desc" } },
                Recording: { orderBy: { createdAt: "desc" } },
                Quiz: { where: { isActive: true } },
                Progress: { where: { studentId: session.user.id } },
              },
            },
          },
        },
      },
    });

    // Transform to include progress and counts
    const subjectsWithProgress = subjects.map((subject) => {
      const unitsWithTopics = subject.Unit.map((unit) => {
        const topicsWithProgress = unit.Topic.map((topic) => {
          const progress = topic.Progress[0] || null;
          return {
            id: topic.id,
            name: topic.name,
            slug: topic.name.toLowerCase().replace(/\s+/g, '-'),
            orderIndex: topic.orderIndex,
            recordingsCount: topic.Recording.length,
            hasQuiz: topic.Quiz.length > 0,
            progress: progress
              ? {
                  lessonViewed: progress.lessonViewed,
                  recordingWatched: progress.recordingWatched,
                  quizCompleted: progress.quizCompleted,
                }
              : undefined,
          };
        });
        return {
          id: unit.id,
          name: unit.name,
          slug: unit.name.toLowerCase().replace(/\s+/g, '-'),
          orderIndex: unit.orderIndex,
          topics: topicsWithProgress,
        };
      });

      return {
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        units: Object.fromEntries(
          unitsWithTopics.map((u) => [u.id, u])
        ),
      };
    });

    return NextResponse.json({ subjects: subjectsWithProgress });
  } catch (error) {
    console.error("Student dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}