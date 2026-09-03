import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3 / Cloudflare R2 presigned-upload helpers.
 *
 * Uploads use the S3-compatible API to produce a short-lived presigned PUT
 * URL; the browser uploads the file directly to the bucket, then the app
 * records the object key in the database. No file bytes ever pass through
 * the Next.js server.
 */

const region = process.env.AWS_REGION || "auto";
const endpoint = process.env.AWS_S3_ENDPOINT;
const bucket = process.env.AWS_S3_BUCKET;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

/** True when S3/R2 credentials are configured. */
export function isUploadConfigured(): boolean {
  return !!bucket && !!endpoint && !!accessKeyId && !!secretAccessKey;
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!isUploadConfigured()) {
    throw new Error("S3/R2 storage is not configured");
  }
  if (!client) {
    client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
      // R2 requires path-style addressing.
      forcePathStyle: true,
    });
  }
  return client;
}

/** Allowed MIME types and their max sizes for resource uploads. */
export const ALLOWED_TYPES: Record<string, { ext: string; maxBytes: number }> = {
  "application/pdf": { ext: "pdf", maxBytes: 25 * 1024 * 1024 },
  "application/msword": { ext: "doc", maxBytes: 25 * 1024 * 1024 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: "docx",
    maxBytes: 25 * 1024 * 1024,
  },
  "image/png": { ext: "png", maxBytes: 10 * 1024 * 1024 },
  "image/jpeg": { ext: "jpg", maxBytes: 10 * 1024 * 1024 },
  "image/webp": { ext: "webp", maxBytes: 10 * 1024 * 1024 },
  "text/plain": { ext: "txt", maxBytes: 2 * 1024 * 1024 },
};

export function isSupportedFileType(mimeType: string): boolean {
  return mimeType in ALLOWED_TYPES;
}

export function maxFileSizeFor(mimeType: string): number | null {
  return ALLOWED_TYPES[mimeType]?.maxBytes ?? null;
}

/** Create a unique object key for a resource upload. */
export function buildObjectKey(mimeType: string, topicId?: string): string {
  const info = ALLOWED_TYPES[mimeType];
  const ext = info?.ext ?? mimeType.split("/")[1] ?? "bin";
  const name = crypto.randomUUID();
  return [`resources`, topicId ? topicId : "general", `${name}.${ext}`].filter(Boolean).join("/");
}

/** Generate a presigned PUT URL for a new object. */
export async function generatePresignedUploadUrl(opts: {
  mimeType: string;
  fileSize: number;
  topicId?: string;
}): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const s3 = getClient();
  const key = buildObjectKey(opts.mimeType, opts.topicId);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: opts.mimeType,
    ContentLength: opts.fileSize,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 60 });
  return { uploadUrl, key, publicUrl: buildPublicUrl(key) };
}

/** Publicly accessible URL for an object (mirrors the remote pattern in next.config). */
export function buildPublicUrl(key: string): string {
  const publicBase =
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.AWS_S3_PUBLIC_URL ||
    // Fallback: bucket served at the account's .r2.dev public origin is not
    // derivable from the API endpoint, so allow an explicit override. Without
    // one, build the best-effort path-style URL.
    (process.env.AWS_S3_ENDPOINT && bucket
      ? `${process.env.AWS_S3_ENDPOINT.replace(/\/$/, "")}/${bucket}`
      : undefined);
  return publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : key;
}
