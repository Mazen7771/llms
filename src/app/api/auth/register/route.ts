import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Security: self-registration is always a STUDENT account. `role` is
    // intentionally ignored so a caller cannot mint a TEACHER account.
    const { password, name, studentId } = body;

    if (!password || !name) {
      return NextResponse.json(
        { error: "Name and password are required" },
        { status: 400 }
      );
    }

    // Check if a student already holds this studentId
    if (studentId) {
      const existingUser = await prisma.user.findUnique({
        where: { studentId },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Student ID already registered" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (always STUDENT for self-registration — role is locked)
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        passwordHash,
        name,
        role: "STUDENT",
        studentId: studentId || null,
        accountStatus: "ACTIVE",
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        role: true,
        studentId: true,
        accountStatus: true,
      },
    });

    return NextResponse.json({
      user,
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}