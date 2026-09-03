import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  generatePresignedUploadUrl,
  isUploadConfigured,
  isSupportedFileType,
  maxFileSizeFor,
} from "@/lib/upload";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isUploadConfigured()) {
      return NextResponse.json(
        { error: "File storage is not configured on this deployment" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { mimeType, fileSize, topicId } = body;

    if (!mimeType || typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json(
        { error: "mimeType and fileSize are required" },
        { status: 400 }
      );
    }

    if (!isSupportedFileType(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, Word, image, or text." },
        { status: 400 }
      );
    }

    const maxBytes = maxFileSizeFor(mimeType);
    if (maxBytes && fileSize > maxBytes) {
      return NextResponse.json(
        { error: `File is too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))}MB.` },
        { status: 400 }
      );
    }

    const { uploadUrl, key, publicUrl } = await generatePresignedUploadUrl({
      mimeType,
      fileSize,
      topicId,
    });

    return NextResponse.json({ uploadUrl, key, publicUrl });
  } catch (error) {
    console.error("Presign upload error:", error);
    return NextResponse.json({ error: "Failed to create upload link" }, { status: 500 });
  }
}
