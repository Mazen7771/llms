import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createDirectUpload, isStreamConfigured } from "@/lib/cloudflare-stream";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isStreamConfigured()) {
      return NextResponse.json(
        { error: "Cloudflare Stream is not configured on this deployment" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { maxDurationSeconds, title, topicId } = body;

    const { uploadURL, uid } = await createDirectUpload({
      maxDurationSeconds,
      meta: {
        title: title || "Untitled recording",
        topicId: topicId || "",
      },
    });

    return NextResponse.json({ uploadURL, uid });
  } catch (error) {
    console.error("Stream upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create video upload" },
      { status: 500 }
    );
  }
}
