import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: studentId } = await params;

    // Verify student exists and is a student
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!student || student.role !== "STUDENT") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Fetch all subjects with units, topics, and progress
    const subjects = await prisma.subject.findMany({
      include: {
        Unit: {
          orderBy: { orderIndex: "asc" },
          include: {
            Topic: {
              orderBy: { orderIndex: "asc" },
              include: {
                Progress: {
                  where: { studentId },
                  select: {
                    lessonViewed: true,
                    recordingWatched: true,
                    quizCompleted: true,
                    updatedAt: true,
                  },
                },
                _count: {
                  select: { Resource: true, Recording: true, Quiz: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Fetch all quiz attempts for this student
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { studentId },
      include: {
        Quiz: {
          include: {
            Topic: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Build a map of quiz attempts by topic
    const attemptsByTopic = new Map<string, typeof quizAttempts>();
    for (const attempt of quizAttempts) {
      const topicId = attempt.Quiz.Topic.id;
      if (!attemptsByTopic.has(topicId)) {
        attemptsByTopic.set(topicId, []);
      }
      attemptsByTopic.get(topicId)!.push(attempt);
    }

    // Transform data with progress
    const subjectsWithProgress = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      slug: subject.slug,
      units: subject.Unit.map((unit) => {
        let totalTopics = 0;
        let completedTopics = 0;

        const topics = unit.Topic.map((topic) => {
          totalTopics++;
          const progress = topic.Progress[0] || {
            lessonViewed: false,
            recordingWatched: false,
            quizCompleted: false,
            updatedAt: null,
          };

          const hasQuiz = topic._count.Quiz > 0;
          const recordingsCount = topic._count.Recording;

          const isCompleted =
            progress.lessonViewed &&
            (recordingsCount === 0 || progress.recordingWatched) &&
            (!hasQuiz || progress.quizCompleted);

          if (isCompleted) completedTopics++;

          // Get quiz attempts for this topic
          const attempts = attemptsByTopic.get(topic.id) || [];
          const latestAttempt = attempts.sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          )[0];

          return {
            id: topic.id,
            name: topic.name,
            orderIndex: topic.orderIndex,
            recordingsCount,
            hasQuiz,
            progress: {
              lessonViewed: progress.lessonViewed,
              recordingWatched: progress.recordingWatched,
              quizCompleted: progress.quizCompleted,
              updatedAt: progress.updatedAt,
            },
            latestAttempt: latestAttempt
              ? {
                  id: latestAttempt.id,
                  score: latestAttempt.score,
                  maxScore: latestAttempt.maxScore,
                  submittedAt: latestAttempt.submittedAt,
                  percentage:
                    latestAttempt.score !== null && latestAttempt.maxScore !== null
                      ? Math.round((latestAttempt.score / latestAttempt.maxScore) * 100)
                      : null,
                }
              : null,
            attemptsCount: attempts.length,
          };
        });

        return {
          id: unit.id,
          name: unit.name,
          orderIndex: unit.orderIndex,
          topics,
          totalTopics,
          completedTopics,
          progress: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
        };
      }),
    }));

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      subjects: subjectsWithProgress,
    });
  } catch (error) {
    console.error("Admin student progress error:", error);
    return NextResponse.json({ error: "Failed to fetch student progress" }, { status: 500 });
  }
}