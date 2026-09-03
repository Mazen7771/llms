import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Security: self-registration is always a STUDENT account. `role` is
    // intentionally ignored so a caller cannot mint a TEACHER account.
    const { email, password, name, studentId } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (always STUDENT for self-registration — role is locked)
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        passwordHash,
        name,
        role: "STUDENT",
        studentId: studentId || null,
        accountStatus: "ACTIVE",
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
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