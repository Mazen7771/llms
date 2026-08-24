import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");

    const where = subjectId ? { subjectId } : {};

    const units = await prisma.unit.findMany({
      where,
      orderBy: { orderIndex: "asc" },
      include: {
        Subject: true,
        Topic: { orderBy: { orderIndex: "asc" } },
        _count: { select: { Topic: true } },
      },
    });

    return NextResponse.json({ units });
  } catch (error) {
    console.error("Admin units error:", error);
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subjectId, name, orderIndex } = body;

    if (!subjectId || !name) {
      return NextResponse.json({ error: "Subject ID and name are required" }, { status: 400 });
    }

    const unit = await prisma.unit.create({
      data: { id: crypto.randomUUID(), subjectId, name, orderIndex: orderIndex || 0, updatedAt: new Date() },
    });

    return NextResponse.json({ unit });
  } catch (error) {
    console.error("Create unit error:", error);
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
  }
}