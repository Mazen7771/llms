import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Validate authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path } = await params;
    const filePath = path.join("/");

    // Get the download query parameter
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "true";

    // The fileKey stored in database is the Vercel Blob URL
    // We need to extract the pathname from the URL to fetch from Vercel Blob
    let blobUrl: string;

    // If the filePath looks like a full URL, use it directly
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      blobUrl = filePath;
    } else {
      // Otherwise construct the blob URL - this handles both cases
      // where fileKey might be a relative path or full URL
      blobUrl = filePath;
    }

    // Validate that the user has access to this resource
    // Check if it's a resource the student/teacher should see
    const resource = await prisma.resource.findFirst({
      where: { fileKey: blobUrl },
      include: { Topic: { include: { Unit: { include: { Subject: true } } } } },
    });

    const recording = await prisma.recording.findFirst({
      where: { streamVideoId: blobUrl }, // unlikely but check
    });

    // For students, verify they have access to the topic's subject
    if (session.user.role === "STUDENT" && resource) {
      // Students can access all resources (no subject restriction in current schema)
      // If you add subject restrictions later, add check here
    }

    // DB-backed files (uploaded without Vercel Blob) use a plain key with no
    // URL scheme. Serve the stored bytes directly instead of fetching a URL.
    if (!/^[a-z][a-z0-9+.-]*:/.test(blobUrl)) {
      const stored = await prisma.uploadedFile.findUnique({ where: { key: blobUrl } });
      if (stored) {
        const headers = new Headers();
        headers.set("Content-Type", stored.contentType);
        headers.set("Content-Length", stored.data.length.toString());
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
        if (download) {
          headers.set("Content-Disposition", `attachment; filename="file"`);
        } else {
          headers.set("Content-Disposition", `inline; filename="file"`);
        }
        return new NextResponse(stored.data, { status: 200, headers });
      }
      // Unknown key that isn't a URL — nothing to fetch.
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Fetch the file from Vercel Blob
    const response = await fetch(blobUrl);

    if (!response.ok) {
      console.error(`Failed to fetch from Vercel Blob: ${response.status} ${response.statusText}`);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Get the file blob
    const fileBlob = await response.blob();

    // Determine content type
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    // Extract filename from URL or use a default
    let filename = "file";
    try {
      const url = new URL(blobUrl);
      filename = url.pathname.split("/").pop() || "file";
      // Remove random suffix added by Vercel Blob if present
      filename = filename.replace(/-[a-z0-9]{16,}\./, ".");
    } catch {
      // If URL parsing fails, use a default
      filename = filePath.split("/").pop() || "file";
    }

    // Prepare headers
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", fileBlob.size.toString());
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
      headers.set("Content-Disposition", `inline; filename="${filename}"`);
    }

    // Add security headers
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return new NextResponse(fileBlob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("File proxy error:", error);
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
  }
}

// Handle HEAD requests for metadata
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse(null, { status: 401 });
    }

    const { path } = await params;
    const filePath = path.join("/");

    let blobUrl: string;
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      blobUrl = filePath;
    } else {
      blobUrl = filePath;
    }

    // DB-backed files: report stored metadata without fetching a URL.
    if (!/^[a-z][a-z0-9+.-]*:/.test(blobUrl)) {
      const stored = await prisma.uploadedFile.findUnique({ where: { key: blobUrl } });
      if (!stored) {
        return new NextResponse(null, { status: 404 });
      }
      const headers = new Headers();
      headers.set("Content-Type", stored.contentType);
      headers.set("Content-Length", stored.data.length.toString());
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("X-Content-Type-Options", "nosniff");
      return new NextResponse(null, { status: 200, headers });
    }

    const response = await fetch(blobUrl, { method: "HEAD" });

    if (!response.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("content-type") || "application/octet-stream");
    headers.set("Content-Length", response.headers.get("content-length") || "0");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(null, { status: 200, headers });
  } catch (error) {
    console.error("File HEAD error:", error);
    return new NextResponse(null, { status: 500 });
  }
}