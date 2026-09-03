import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSettings, setSettings } from "@/lib/settings";

const DEFAULTS = {
  siteName: "Learning Management System",
  siteDescription: "Biology and Chemistry LMS for Miss Sulafa",
  contactEmail: "admin@lms.example.com",
  maintenanceMode: false,
};

const KEYS = Object.keys(DEFAULTS).map((k) => `general.${k}`);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getSettings(KEYS, DEFAULTS);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("General settings error:", error);
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
    const entries: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (key in body && body[key] !== undefined) {
        entries[`general.${key}`] = body[key];
      }
    }
    await setSettings(entries);

    return NextResponse.json({ message: "Settings saved", settings: body });
  } catch (error) {
    console.error("Update general settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}
