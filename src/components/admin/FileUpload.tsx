"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const ACCEPT =
  "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,text/plain";

interface Props {
  topicId: string;
  onUploaded: () => void;
  defaultTitle?: string;
}

/**
 * Teacher file upload. Flow:
 *   1. Ask /api/upload/presign for a short-lived upload URL.
 *   2. PUT the file bytes directly to that URL.
 *   3. POST the resource metadata to /api/admin/resources.
 */
export function FileUpload({ topicId, onUploaded, defaultTitle }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: "error", text: "Choose a file first." });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      // 1. Get presigned URL
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, fileSize: file.size, topicId }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) throw new Error(presign.error || "Failed to create upload link");

      // 2. Upload bytes to storage
      const uploadRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      // 3. Save the resource record
      const createRes = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          type: "RESOURCE",
          title: title || file.name,
          description: description || null,
          fileKey: presign.key,
          fileType: file.type,
          fileSize: file.size,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || "Failed to save resource");

      setMessage({ type: "success", text: `Uploaded "${title || file.name}"` });
      setFile(null);
      setTitle("");
      setDescription("");
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Upload failed",
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
          placeholder="Resource title"
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
          accept={ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-200 dark:file:bg-gray-700 file:text-sm file:font-medium cursor-pointer"
          aria-label="Choose file to upload"
        />
        <Button onClick={handleUpload} loading={uploading} size="sm">
          Upload
        </Button>
      </div>
      {file && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {file.name} ({(file.size / 1024).toFixed(1)} KB)
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
