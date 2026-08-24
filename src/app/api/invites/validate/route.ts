import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("code");

    if (!token) {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        User_Invite_invitedByIdToUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ valid: false, error: "Invalid invite code" }, { status: 404 });
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: "Invite code has expired" }, { status: 400 });
    }

    if (invite.status === "ACCEPTED") {
      return NextResponse.json({ valid: false, error: "Invite code has already been used" }, { status: 400 });
    }

    if (invite.status === "EXPIRED") {
      return NextResponse.json({ valid: false, error: "Invite code has expired" }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      invite: {
        id: invite.id,
        token: invite.token,
        email: invite.email,
        studentId: invite.studentId,
        status: invite.status,
        createdBy: invite.User_Invite_invitedByIdToUser,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error("Validate invite error:", error);
    return NextResponse.json({ error: "Failed to validate invite" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Invite code has expired" }, { status: 400 });
    }

    if (invite.status === "ACCEPTED") {
      return NextResponse.json({ error: "Invite code has already been used" }, { status: 400 });
    }

    if (invite.status === "EXPIRED") {
      return NextResponse.json({ error: "Invite code has expired" }, { status: 400 });
    }

    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Invite code validated",
      invite: {
        id: invite.id,
        token: invite.token,
        email: invite.email,
        studentId: invite.studentId,
      },
    });
  } catch (error) {
    console.error("Use invite error:", error);
    return NextResponse.json({ error: "Failed to use invite" }, { status: 500 });
  }
}