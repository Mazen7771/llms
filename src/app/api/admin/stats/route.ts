import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalStudents,
      totalSubjects,
      totalUnits,
      totalTopics,
      totalResources,
      totalRecordings,
      totalQuizzes,
      totalQuizAttempts,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.subject.count(),
      prisma.unit.count(),
      prisma.topic.count(),
      prisma.resource.count(),
      prisma.recording.count(),
      prisma.quiz.count(),
      prisma.quizAttempt.count(),
    ]);

    const recentStudents = await prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, studentId: true, createdAt: true },
    });

    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { User: { select: { name: true, email: true } } },
    });

    return NextResponse.json({
      stats: {
        totalStudents,
        totalSubjects,
        totalUnits,
        totalTopics,
        totalResources,
        totalRecordings,
        totalQuizzes,
        totalQuizAttempts,
      },
      recentStudents,
      recentActivity,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}