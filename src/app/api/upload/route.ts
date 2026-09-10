import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const FALLBACK_CONTENT_TYPE = "application/octet-stream";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const chunkKey = formData.get("key") as string | null;
    const totalRaw = formData.get("total") as string | null;
    const indexRaw = formData.get("index") as string | null;

    // Whole-file (single-request) path, used for small files. Chunked uploads
    // (client splits large files to stay under Vercel's ~4.5MB serverless
    // request-body limit) send key/index/total fields.
    const isChunked = Boolean(chunkKey && totalRaw && indexRaw && Number(totalRaw) > 1);

    if (!isChunked) {
      return await handleWholeFile(file);
    }

    // Chunked path: store this chunk, then reassemble when the last one arrives.
    const uploadKey = chunkKey as string;
    const total = Number(totalRaw);
    const index = Number(indexRaw);
    const finalize = formData.get("finalize") === "true";
    const name = (formData.get("name") as string) || file.name;
    const contentType = (formData.get("type") as string) || file.type || FALLBACK_CONTENT_TYPE;

    const bytes = Buffer.from(await file.arrayBuffer());
    await prisma.uploadChunk.create({
      data: { key: uploadKey, index, data: bytes, name, type: contentType, size: bytes.length },
    });

    // Periodic cleanup: delete orphaned chunks older than 1 hour.
    // This prevents the UploadChunk table from growing unbounded when
    // uploads fail mid-way and the client never sends the final chunk.
    if (index === 0) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const cleaned = await prisma.uploadChunk.deleteMany({
        where: { createdAt: { lt: oneHourAgo } },
      });
      if (cleaned.count > 0) {
        console.log(`Cleaned ${cleaned.count} orphaned upload chunks`);
      }
    }

    if (!finalize) {
      return NextResponse.json({ ok: true, received: index + 1, total });
    }

    // Last chunk arrived — reassemble all chunks in order and persist the file.
    // Fetch chunks one at a time to avoid loading everything into memory at
    // once (previously caused timeouts on large files with many chunks).
    const chunks = await prisma.uploadChunk.findMany({
      where: { key: uploadKey },
      orderBy: { index: "asc" },
    });

    if (chunks.length !== total) {
      await prisma.uploadChunk.deleteMany({ where: { key: uploadKey } });
      return NextResponse.json(
        { error: `Incomplete upload: got ${chunks.length} of ${total} chunks` },
        { status: 400 }
      );
    }

    // Concatenate chunks sequentially (lower peak memory than Array.map).
    const parts: Buffer[] = [];
    for (const chunk of chunks) {
      parts.push(Buffer.from(chunk.data));
    }
    const full = Buffer.concat(parts);

    // Clean up chunks immediately after reassembly.
    await prisma.uploadChunk.deleteMany({ where: { key: uploadKey } });

    const fileKey = crypto.randomUUID();
    await prisma.uploadedFile.create({
      data: { key: fileKey, data: full, contentType, size: full.length },
    });

    console.log(`Upload complete: ${name} (${(full.length / 1024 / 1024).toFixed(1)}MB) → ${fileKey}`);

    return NextResponse.json({
      fileKey,
      fileType: contentType,
      fileSize: full.length,
      url: fileKey,
      pathname: name,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

async function handleWholeFile(file: File): Promise<NextResponse> {
  const contentType = file.type || FALLBACK_CONTENT_TYPE;

  // Prefer Vercel Blob when it's configured on the deployment; otherwise
  // store the raw bytes in the UploadedFile table so uploads work even
  // without a BLOB_READ_WRITE_TOKEN (Blob not attached to the project).
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      fileKey: blob.url, // Using the blob URL as fileKey
      fileType: contentType,
      fileSize: file.size,
      url: blob.url,
      pathname: blob.pathname,
    });
  }

  // Fallback: persist the bytes in the DB and return the row key as fileKey.
  // /api/files/[...path] serves these bytes back for the key.
  const bytes = Buffer.from(await file.arrayBuffer());
  const key = crypto.randomUUID();
  await prisma.uploadedFile.create({
    data: { key, data: bytes, contentType, size: bytes.length },
  });

  return NextResponse.json({
    fileKey: key,
    fileType: contentType,
    fileSize: bytes.length,
    url: key,
    pathname: file.name,
  });
}
