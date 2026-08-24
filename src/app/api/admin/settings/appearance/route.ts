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

    // Return default appearance settings (could be stored in DB)
    return NextResponse.json({
      theme: "light",
      primaryColor: "#0f6e63",
      secondaryColor: "#1b4b66",
      logoUrl: null,
      faviconUrl: null,
    });
  } catch (error) {
    console.error("Appearance settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // TODO: Save to database
    console.log("Saving appearance settings:", body);

    return NextResponse.json({ message: "Settings saved", settings: body });
  } catch (error) {
    console.error("Update appearance error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}