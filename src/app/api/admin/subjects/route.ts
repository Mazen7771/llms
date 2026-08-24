import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        Unit: { orderBy: { orderIndex: "asc" } },
        _count: { select: { Unit: true } },
      },
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error("Admin subjects error:", error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const existing = await prisma.subject.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) {
      return NextResponse.json({ error: "Subject already exists" }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: { id: crypto.randomUUID(), name, slug, updatedAt: new Date() },
    });

    return NextResponse.json({ subject });
  } catch (error) {
    console.error("Create subject error:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}