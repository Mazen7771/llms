import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      emailNotifications: true,
      newContentAlerts: true,
      quizResultAlerts: true,
      announcementAlerts: true,
    });
  } catch (error) {
    console.error("Notification settings error:", error);
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
    console.log("Saving notification settings:", body);

    return NextResponse.json({ message: "Settings saved", settings: body });
  } catch (error) {
    console.error("Update notification settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}