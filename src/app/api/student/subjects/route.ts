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

    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        Unit: {
          orderBy: { orderIndex: "asc" },
          include: {
            Topic: { orderBy: { orderIndex: "asc" } },
            _count: { select: { Topic: true } },
          },
        },
        _count: { select: { Unit: true } },
      },
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error("Student subjects error:", error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}