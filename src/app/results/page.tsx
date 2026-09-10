"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";

const ACCEPT =
  "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,text/plain";

interface ResultItem {
  id: string;
  title: string;
  description: string | null;
  fileKey: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  User: { name: string | null } | null;
}

const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB, under Vercel's ~4.5MB serverless body limit

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(fileType: string): string {
  if (fileType === "application/pdf") return "📄";
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType.includes("word")) return "📝";
  if (fileType === "text/plain") return "📃";
  return "📁";
}

function downloadUrl(fileKey: string): string {
  return `/api/files/${encodeURIComponent(fileKey)}?download=true`;
}

export default function ResultsPage() {
  const { data: session, status } = useSession();
  const isTeacher = session?.user?.role === "TEACHER";

  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload form state
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchResults = async () => {
    try {
      const res = await fetch("/api/results");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load results");
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchResults();
    else if (status === "unauthenticated") setLoading(false);
  }, [status]);

  // Mirrors the chunked XHR upload used across the admin content page.
  const postForm = (formData: FormData) =>
    new Promise<any>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
      xhr.addEventListener("error", () => resolve(null));
      xhr.addEventListener("abort", () => resolve(null));
      xhr.send(formData);
    });

  const uploadFile = async (uploadFile: File): Promise<{ fileKey: string; fileSize: number; fileType: string } | null> => {
    const totalChunks = Math.ceil(uploadFile.size / CHUNK_SIZE);

    if (totalChunks <= 1) {
      const formData = new FormData();
      formData.append("file", uploadFile);
      return await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
        xhr.addEventListener("error", () => resolve(null));
        xhr.addEventListener("abort", () => resolve(null));
        xhr.send(formData);
      });
    }

    const uploadKey = crypto.randomUUID();
    let uploadedBytes = 0;
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(uploadFile.size, start + CHUNK_SIZE);
      const chunk = uploadFile.slice(start, end);

      const formData = new FormData();
      formData.append("file", chunk);
      formData.append("key", uploadKey);
      formData.append("index", String(i));
      formData.append("total", String(totalChunks));
      formData.append("name", uploadFile.name);
      formData.append("type", uploadFile.type || "application/octet-stream");
      formData.append("finalize", String(i === totalChunks - 1));

      const res = await postForm(formData);
      if (!res) return null;
      uploadedBytes += end - start;
      setProgress(Math.round((uploadedBytes / uploadFile.size) * 100));
      if (i === totalChunks - 1) return res;
    }
    return null;
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadMessage({ type: "error", text: "Choose a file to upload." });
      return;
    }
    if (!title.trim()) {
      setUploadMessage({ type: "error", text: "Give the result a title (e.g. \"Midterm Results — Form 4\")." });
      return;
    }
    setUploading(true);
    setProgress(0);
    setUploadMessage(null);
    try {
      const fileInfo = await uploadFile(file);
      if (!fileInfo?.fileKey) {
        setUploadMessage({ type: "error", text: "Upload failed. Try again." });
        return;
      }

      const createRes = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          fileKey: fileInfo.fileKey,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || "Failed to save result");

      setUploadMessage({ type: "success", text: `"${title}" published — visible to all students.` });
      setTitle("");
      setDescription("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      fetchResults();
    } catch (e) {
      setUploadMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save result" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/results?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      fetchResults();
    } catch (e) {
      setUploadMessage({ type: "error", text: e instanceof Error ? e.message : "Delete failed" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl" aria-hidden="true">🏆</span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Results</h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl">
        Exam and assessment results shared by your teachers. Open any entry below to view or download the file.
      </p>

      {isTeacher && (
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-8" aria-label="Publish a result">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Publish a result</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="result-title">
                Title
              </label>
              <input
                id="result-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "Mock Exam Results — Form 4"'
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="result-description">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="result-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any extra info — subject, grade, date, how students should read it."
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
                aria-label="Choose result file to upload (PDF, Word, image, or text)"
              />
              <Button onClick={handleUpload} loading={uploading} disabled={!file} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}>
                Publish
              </Button>
            </div>
            {uploading && (
              <div className="space-y-1">
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{progress}% uploaded</p>
              </div>
            )}
            {file && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {fileIcon(file.type)} {file.name} ({formatBytes(file.size)})
              </p>
            )}
            {uploadMessage && (
              <p className={`text-sm ${uploadMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} role="status">
                {uploadMessage.text}
              </p>
            )}
          </div>
        </section>
      )}

      <section aria-label="Published results">
        {loading ? (
          <div className="flex items-center justify-center py-16" aria-busy="true">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
          </div>
        ) : error ? (
          <p className="text-center text-red-600 dark:text-red-400 py-16">{error}</p>
        ) : results.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-4xl mb-3" aria-hidden="true">📭</p>
            <p>{isTeacher ? "No results yet — publish the first one above." : "No results have been published yet. Check back soon."}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {results.map((result) => (
              <li
                key={result.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex items-start justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{fileIcon(result.fileType)}</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{result.title}</h3>
                  </div>
                  {result.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{result.description}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {result.fileName} · {formatBytes(result.fileSize)}
                    {result.User?.name ? ` · uploaded by ${result.User.name}` : ""}
                    {` · ${new Date(result.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(downloadUrl(result.fileKey), "_blank")}
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                  >
                    View
                  </Button>
                  {isTeacher && (
                    <Button variant="danger" size="sm" onClick={() => handleDelete(result.id, result.title)}>
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}