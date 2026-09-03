import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const topicId = formData.get("topicId") as string | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const durationSeconds = formData.get("durationSeconds") ? parseInt(formData.get("durationSeconds") as string) : undefined;
    const recordedDate = formData.get("recordedDate") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!topicId || !title) {
      return NextResponse.json({ error: "Missing required fields: topicId, title" }, { status: 400 });
    }

    // Create a direct upload URL in Mux
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ["public"],
        test: false,
      },
      cors_origin: "*",
    });

    // Return the upload URL and upload ID for client-side upload
    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
      // These will be used after the upload completes via webhook or polling
      // For now, we return the info needed for the recordings API
      streamVideoId: null, // Will be populated after upload completes
      message: "Use the uploadUrl to upload the video directly to Mux. The streamVideoId will be available after processing.",
    });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json({ error: "Failed to create video upload" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json({ error: "Upload ID required" }, { status: 400 });
    }

    // Check upload status
    const upload = await mux.video.uploads.retrieve(uploadId);

    if (upload.asset_id) {
      // Get the asset to retrieve the playback ID
      const asset = await mux.video.assets.retrieve(upload.asset_id);
      const playbackId = asset.playback_ids?.[0]?.id;

      return NextResponse.json({
        status: upload.status,
        assetId: upload.asset_id,
        streamVideoId: playbackId, // This is the streamVideoId for the recordings API
        playbackId,
        duration: asset.duration,
      });
    }

    return NextResponse.json({
      status: upload.status,
      assetId: null,
      streamVideoId: null,
    });
  } catch (error) {
    console.error("Video upload status error:", error);
    return NextResponse.json({ error: "Failed to check upload status" }, { status: 500 });
  }
}