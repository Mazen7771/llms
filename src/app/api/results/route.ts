import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * Results are visible to every logged-in user (students + teachers).
 * Teachers additionally upload result files and remove them.
 */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await prisma.resultFile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        User: { select: { name: true, role: true } },
      },
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("List results error:", error);
    return NextResponse.json({ error: "Failed to load results" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, fileKey, fileName, fileType, fileSize } = body;

    if (!title || !title.trim() || !fileKey) {
      return NextResponse.json(
        { error: "Title and uploaded file are required" },
        { status: 400 }
      );
    }

    if (String(fileKey).length > 2048) {
      return NextResponse.json({ error: "Invalid file reference" }, { status: 400 });
    }

    const result = await prisma.resultFile.create({
      data: {
        title: title.trim().slice(0, 200),
        description: description?.trim()?.slice(0, 1000) || null,
        fileKey,
        fileName: (fileName || "result").slice(0, 255),
        fileType: fileType || "application/octet-stream",
        fileSize: Math.max(0, Math.floor(Number(fileSize) || 0)),
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    console.error("Create result error:", error);
    return NextResponse.json({ error: "Failed to save result" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.resultFile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    // Remove the stored bytes too when they live in the DB fallback table.
    // Blob-hosted keys (https://...) are not stored locally and are left alone.
    if (!/^[a-z][a-z0-9+.-]*:/.test(existing.fileKey)) {
      await prisma.uploadedFile.deleteMany({ where: { key: existing.fileKey } });
    }

    await prisma.resultFile.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete result error:", error);
    return NextResponse.json({ error: "Failed to delete result" }, { status: 500 });
  }
}