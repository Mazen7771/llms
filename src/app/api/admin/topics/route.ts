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
    const unitId = searchParams.get("unitId");

    const where = unitId ? { unitId } : {};

    const topics = await prisma.topic.findMany({
      where,
      orderBy: { orderIndex: "asc" },
      include: {
        Unit: { include: { Subject: true } },
        _count: { select: { Resource: true, Recording: true, Quiz: true } },
      },
    });

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Admin topics error:", error);
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { unitId, name, orderIndex } = body;

    if (!unitId || !name) {
      return NextResponse.json({ error: "Unit ID and name are required" }, { status: 400 });
    }

    const topic = await prisma.topic.create({
      data: { id: crypto.randomUUID(), unitId, name, orderIndex: orderIndex || 0, updatedAt: new Date() },
    });

    return NextResponse.json({ topic });
  } catch (error) {
    console.error("Create topic error:", error);
    return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, orderIndex } = body;

    if (!id) {
      return NextResponse.json({ error: "Topic ID is required" }, { status: 400 });
    }

    const topic = await prisma.topic.update({
      where: { id },
      data: { name, orderIndex, updatedAt: new Date() },
    });

    return NextResponse.json({ topic });
  } catch (error) {
    console.error("Update topic error:", error);
    return NextResponse.json({ error: "Failed to update topic" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Topic ID is required" }, { status: 400 });
    }

    await prisma.topic.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete topic error:", error);
    return NextResponse.json({ error: "Failed to delete topic" }, { status: 500 });
  }
}