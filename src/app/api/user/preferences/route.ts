import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSettings, setSettings } from "@/lib/settings";

const DEFAULTS = {
  notifications: {
    email: true,
    push: true,
    quizResults: true,
    announcements: true,
  },
  theme: "system",
  reducedMotion: false,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user preferences, namespaced under "prefs:user:<id>".
    const prefix = `prefs:${session.user.id}`;
    const stored = await getSettings(
      [
        `${prefix}.notifications`,
        `${prefix}.theme`,
        `${prefix}.reducedMotion`,
      ],
      {
        notifications: DEFAULTS.notifications,
        theme: DEFAULTS.theme,
        reducedMotion: DEFAULTS.reducedMotion,
      }
    );

    return NextResponse.json(stored);
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
    const prefix = `prefs:${session.user.id}`;
    const entries: Record<string, unknown> = {};

    if (body.notifications !== undefined) entries[`${prefix}.notifications`] = body.notifications;
    if (body.theme !== undefined) entries[`${prefix}.theme`] = body.theme;
    if (body.reducedMotion !== undefined) entries[`${prefix}.reducedMotion`] = body.reducedMotion;

    await setSettings(entries);

    return NextResponse.json({ message: "Preferences saved", preferences: body });
  } catch (error) {
    console.error("Update preferences error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
