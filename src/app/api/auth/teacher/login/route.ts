import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, password } = body;

    if (!studentId || !password) {
      return NextResponse.json(
        { error: "Teacher ID and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { studentId: studentId.trim() },
    });

    if (!user || user.role !== "TEACHER" || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.accountStatus !== "ACTIVE") {
      return NextResponse.json(
        { error: "Account is disabled" },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.studentId,
      },
    });
  } catch (error) {
    console.error("Teacher login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}