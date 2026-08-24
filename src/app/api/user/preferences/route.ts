import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return default preferences (could be stored in DB)
    return NextResponse.json({
      notifications: {
        email: true,
        push: true,
        quizResults: true,
        announcements: true,
      },
      theme: "system",
      reducedMotion: false,
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Saving preferences:", body);

    return NextResponse.json({ message: "Preferences saved", preferences: body });
  } catch (error) {
    console.error("Update preferences error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}