import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const type = searchParams.get("type"); // subjects, topics, quizzes, recordings, resources

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = query.toLowerCase();
    const results: any = {};

    if (!type || type === "subjects") {
      const subjects = await prisma.subject.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { slug: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        include: {
          Unit: {
            include: {
              Topic: true,
            },
          },
        },
        take: 10,
      });
      results.subjects = subjects;
    }

    if (!type || type === "topics") {
      const topics = await prisma.topic.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        include: {
          Unit: {
            include: { Subject: true },
          },
        },
        take: 10,
      });
      results.topics = topics;
    }

    if (!type || type === "quizzes") {
      const quizzes = await prisma.quiz.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
          ],
          isActive: true,
        },
        include: {
          Topic: {
            include: { Unit: { include: { Subject: true } } },
          },
        },
        take: 10,
      });
      results.quizzes = quizzes;
    }

    if (!type || type === "recordings") {
      const recordings = await prisma.recording.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        include: {
          Topic: {
            include: { Unit: { include: { Subject: true } } },
          },
        },
        take: 10,
      });
      results.recordings = recordings;
    }

    if (!type || type === "resources") {
      const resources = await prisma.resource.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        include: {
          Topic: {
            include: { Unit: { include: { Subject: true } } },
          },
        },
        take: 10,
      });
      results.resources = resources;
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}