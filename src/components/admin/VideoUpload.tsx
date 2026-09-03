"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  topicId: string;
  onUploaded: () => void;
}

/**
 * Teacher video upload via Cloudflare Stream direct-creator-upload.
 *   1. POST /api/upload/stream -> one-time uploadURL + uid.
 *   2. PUT the video bytes to that uploadURL.
 *   3. POST recording metadata to /api/admin/recordings (streamVideoId = uid).
 */
export function VideoUpload({ topicId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: "error", text: "Choose a video first." });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      // 1. Get a one-time Cloudflare Stream upload URL
      const initRes = await fetch("/api/upload/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, topicId, maxDurationSeconds: 3600 }),
      });
      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error || "Failed to create video upload");

      // 2. Upload the bytes to Cloudflare (Stream accepts a raw PUT)
      const uploadRes = await fetch(init.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Video upload to Cloudflare failed");

      // 3. Save the recording record
      const createRes = await fetch("/api/admin/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          title: title || file.name,
          description: description || null,
          streamVideoId: init.uid,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || "Failed to save recording");

      setMessage({ type: "success", text: `Uploaded "${title || file.name}". Processing in Cloudflare…` });
      setFile(null);
      setTitle("");
      setDescription("");
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Video upload failed",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Recording title"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-200 dark:file:bg-gray-700 file:text-sm file:font-medium cursor-pointer"
          aria-label="Choose video to upload"
        />
        <Button onClick={handleUpload} loading={uploading} size="sm">
          Upload video
        </Button>
      </div>
      {file && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
        </p>
      )}
      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
