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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    const where: any = { role: "STUDENT" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { studentId: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) {
      where.accountStatus = status;
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true,
          accountStatus: true,
          createdAt: true,
          _count: { select: { Progress: true, QuizAttempt: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      students,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin students error:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, name, studentId, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    if (studentId) {
      const existingId = await prisma.user.findUnique({ where: { studentId } });
      if (existingId) {
        return NextResponse.json({ error: "Student ID already exists" }, { status: 400 });
      }
    }

    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name,
        studentId,
        passwordHash,
        role: "STUDENT",
        accountStatus: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Create student error:", error);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}