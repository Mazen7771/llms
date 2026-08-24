import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (notification.readAt) {
      return NextResponse.json({ message: "Already read" });
    }

    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ message: "Marked as read" });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}