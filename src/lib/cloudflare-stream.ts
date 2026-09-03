const CF_API = "https://api.cloudflare.com/client/v4";

/**
 * Cloudflare Stream helpers.
 *
 * The teacher uploads a video to Cloudflare Stream via a one-time "direct
 * creator upload" URL. These helpers create that upload URL (server side,
 * using CLOUDFLARE_API_TOKEN) and build player URLs for playback. The actual
 * video bytes are uploaded straight from the browser to Stream.
 */

export function isStreamConfigured(): boolean {
  return !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

export interface DirectUploadResult {
  uploadURL: string;
  uid: string;
}

/** Create a one-time direct-creator-upload URL for a new video. */
export async function createDirectUpload(opts: {
  maxDurationSeconds?: number;
  meta?: Record<string, string>;
}): Promise<DirectUploadResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Stream is not configured");
  }

  const res = await fetch(`${CF_API}/accounts/${accountId}/stream/direct_upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      maxDurationSeconds: opts.maxDurationSeconds ?? 3600,
      meta: opts.meta ?? {},
    }),
  });

  const json = (await res.json()) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: {
      uploadURL?: string;
      uid?: string;
    };
  };

  if (!res.ok || !json.success || !json.result?.uploadURL || !json.result.uid) {
    const msg = json.errors?.[0]?.message || "Failed to create upload URL";
    throw new Error(msg);
  }

  return { uploadURL: json.result.uploadURL, uid: json.result.uid };
}

/** Build an iframe/player URL for a stream video. */
export function buildPlayerUrl(uid: string): string {
  const domain = process.env.CLOUDFLARE_STREAM_DOMAIN;
  if (domain) {
    // customer-<hash>.<domain>/<uid>/iframe
    return `https://${domain}/${uid}/iframe`;
  }
  // Fall back to the default Cloudflare Stream player origin.
  return `https://iframe.videodelivery.net/${uid}`;
}
