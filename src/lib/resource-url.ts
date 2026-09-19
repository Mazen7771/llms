/**
 * Resolve a stored Resource.fileKey into a URL the browser can actually
 * open, for any of the three storage generations this app has gone
 * through:
 *   - Newest: a full Supabase Storage https:// URL
 *   - Previous: a full Vercel Blob https:// URL
 *   - Oldest: an opaque key with no URL scheme, for a file whose bytes are
 *     stored directly in the UploadedFile table
 *
 * This mirrors getResourceOpenUrl/getResourceDownloadUrl in
 * src/app/admin/content/page.tsx exactly, so both the teacher and student
 * sides resolve the same fileKey the same way. Do not use
 * buildPublicUrl() from "@/lib/upload" for this - that helper is specific
 * to the (no longer used for new uploads) S3/R2 setup and has no concept
 * of the http(s) vs. opaque-key distinction, so it silently returns an
 * opaque key unresolved instead of routing it through /api/files.
 */
export function resolveResourceUrl(fileKey: string): string {
  if (fileKey.startsWith("http://") || fileKey.startsWith("https://")) {
    return fileKey;
  }
  return `/api/files/${encodeURIComponent(fileKey)}`;
}

export function resolveResourceDownloadUrl(fileKey: string): string {
  if (fileKey.startsWith("http://") || fileKey.startsWith("https://")) {
    try {
      const url = new URL(fileKey);
      url.searchParams.set("download", "");
      return url.toString();
    } catch {
      return fileKey;
    }
  }
  return `/api/files/${encodeURIComponent(fileKey)}?download=true`;
}
