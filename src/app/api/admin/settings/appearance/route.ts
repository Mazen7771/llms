import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSettings, setSettings } from "@/lib/settings";

const DEFAULTS = {
  theme: "light",
  primaryColor: "#0f6e63",
  secondaryColor: "#1b4b66",
  logoUrl: null,
  faviconUrl: null,
};

const KEYS = Object.keys(DEFAULTS).map((k) => `appearance.${k}`);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getSettings(KEYS, DEFAULTS);
    return NextResponse.json(settings);
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
    const entries: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (key in body && body[key] !== undefined) {
        entries[`appearance.${key}`] = body[key];
      }
    }
    await setSettings(entries);

    return NextResponse.json({ message: "Settings saved", settings: body });
  } catch (error) {
    console.error("Update appearance error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}
