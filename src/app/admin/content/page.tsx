"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/admin/FileUpload";
import { VideoUpload } from "@/components/admin/VideoUpload";

interface Subject {
  id: string;
  name: string;
  slug: string;
}

interface Unit {
  id: string;
  name: string;
  orderIndex: number;
  topics: Topic[];
}

interface Topic {
  id: string;
  name: string;
  orderIndex: number;
  resources: Resource[];
  recordings: Recording[];
  quizzes: Quiz[];
  _count?: { Resource: number; Recording: number; Quiz: number };
}

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  fileKey: string;
  fileType: string;
  fileSize: number;
  publicUrl?: string;
}

interface Recording {
  id: string;
  title: string;
  description?: string | null;
  streamVideoId: string;
  playerUrl?: string;
}

interface Quiz {
  id: string;
  title: string;
  isActive: boolean;
  _count?: { Question: number };
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function ContentManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [unitsBySubject, setUnitsBySubject] = useState<Record<string, Unit[]>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [expandedTopic, setExpandedTopic] = useState<string>("");
  const [detail, setDetail] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newTopic, setNewTopic] = useState("");

  const loadSubjects = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/subjects");
      const data = await res.json();
      setSubjects(data.subjects ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadUnits = useCallback(async (subjectId: string) => {
    if (!subjectId) return;
    try {
      const res = await fetch(`/api/admin/units?subjectId=${encodeURIComponent(subjectId)}`);
      const data = await res.json();
      setUnitsBySubject((prev) => ({ ...prev, [subjectId]: data.units ?? [] }));
    } catch {
      /* ignore */
    }
  }, []);

  const loadTopicDetail = useCallback(async (topicId: string) => {
    if (!topicId) return;
    try {
      const res = await fetch(`/api/student/topics?topicId=${encodeURIComponent(topicId)}`);
      const data = await res.json();
      if (data?.topic) {
        // Student endpoint requires STUDENT role; use admin resource routes instead.
      }
      // Fall back to admin resource/recording/quiz routes
      const [resourceRes, recordingRes, quizRes] = await Promise.all([
        fetch(`/api/admin/resources?topicId=${encodeURIComponent(topicId)}`),
        fetch(`/api/admin/recordings?topicId=${encodeURIComponent(topicId)}`),
        fetch(`/api/admin/quizzes?topicId=${encodeURIComponent(topicId)}`),
      ]);
      const [resourcesData, recordingsData, quizzesData] = await Promise.all([
        resourceRes.json(),
        recordingRes.json(),
        quizRes.json(),
      ]);
      setDetail({
        id: topicId,
        name: "",
        orderIndex: 0,
        resources: resourcesData.resources ?? [],
        recordings: recordingsData.recordings ?? [],
        quizzes: quizzesData.quizzes ?? [],
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadSubjects().finally(() => setLoading(false));
  }, [loadSubjects]);

  const handleSelectSubject = (id: string) => {
    setSelectedSubject(id);
    setSelectedUnit("");
    setSelectedTopic("");
    setExpandedTopic("");
    setDetail(null);
    loadUnits(id);
  };

  const handleSelectUnit = (id: string) => {
    setSelectedUnit(id);
    setSelectedTopic("");
    setExpandedTopic("");
    setDetail(null);
  };

  const handleSelectTopic = (id: string) => {
    setSelectedTopic(id);
    setExpandedTopic(id);
    setDetail(null);
    loadTopicDetail(id);
  };

  const createSubject = async () => {
    if (!newSubject.trim()) return;
    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSubject.trim(), slug: slugify(newSubject) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error || "Failed to create subject");
    } else {
      setToast(`Created subject "${data.subject.name}"`);
      setNewSubject("");
      await loadSubjects();
    }
  };

  const createUnit = async () => {
    if (!selectedSubject || !newUnit.trim()) return;
    const units = unitsBySubject[selectedSubject] || [];
    const res = await fetch("/api/admin/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: selectedSubject, name: newUnit.trim(), orderIndex: units.length }),
    });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error || "Failed to create unit");
    } else {
      setToast(`Created unit "${data.unit.name}"`);
      setNewUnit("");
      await loadUnits(selectedSubject);
    }
  };

  const createTopic = async () => {
    if (!selectedUnit || !newTopic.trim()) return;
    const units = unitsBySubject[selectedSubject] || [];
    const unit = units.find((u) => u.id === selectedUnit);
    const orderIndex = unit ? unit.topics.length : 0;
    const res = await fetch("/api/admin/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId: selectedUnit, name: newTopic.trim(), orderIndex }),
    });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error || "Failed to create topic");
    } else {
      setToast(`Created topic "${data.topic.name}"`);
      setNewTopic("");
      await loadUnits(selectedSubject);
    }
  };

  const refreshDetail = () => {
    if (selectedTopic) loadTopicDetail(selectedTopic);
    if (selectedSubject) loadUnits(selectedSubject);
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  const currentUnits = selectedSubject ? unitsBySubject[selectedSubject] || [] : [];
  const selectedUnitObj = currentUnits.find((u) => u.id === selectedUnit);
  const selectedTopicObj = selectedUnitObj?.topics.find((t) => t.id === selectedTopic);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Library</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage subjects, units, topics, resources, and recordings
          </p>
        </div>
      </header>

      {toast && (
        <div
          className="p-4 rounded-xl border bg-primary/10 border-primary/30 text-gray-900 dark:text-white animate-slide-in"
          role="status"
        >
          {toast}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subjects column */}
        <Card variant="outlined" padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subjects</h2>
          <div className="space-y-2 mb-4">
            {subjects.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No subjects yet.</p>
            )}
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSubject(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSubject === s.id
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createSubject()}
              placeholder="New subject name"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
            <Button size="sm" onClick={createSubject}>Add</Button>
          </div>
        </Card>

        {/* Units column */}
        <Card variant="outlined" padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Units</h2>
          {!selectedSubject ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Select a subject first.</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {currentUnits.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No units yet.</p>
                )}
                {currentUnits.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUnit(u.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedUnit === u.id
                        ? "bg-secondary text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {u.name} ({u.topics.length})
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createUnit()}
                  placeholder="New unit name"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
                <Button size="sm" onClick={createUnit}>Add</Button>
              </div>
            </>
          )}
        </Card>

        {/* Topics column */}
        <Card variant="outlined" padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Topics</h2>
          {!selectedUnit ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Select a unit first.</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {selectedUnitObj?.topics.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No topics yet.</p>
                )}
                {(selectedUnitObj?.topics || []).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTopic(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedTopic === t.id
                        ? "bg-accent text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {t.name} ({t._count?.Resource || 0} res, {t._count?.Recording || 0} vids,{" "}
                    {t._count?.Quiz || 0} quizzes)
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTopic()}
                  placeholder="New topic name"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
                <Button size="sm" onClick={createTopic}>Add</Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Selected topic detail */}
      {selectedTopic && detail && (
        <Card variant="outlined" padding="lg" className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {selectedTopicObj?.name || "Topic"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Upload files and videos, and manage quizzes here.
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  📄 Upload Resource
                </h3>
                <FileUpload topicId={selectedTopic} onUploaded={refreshDetail} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  🎥 Upload Recording
                </h3>
                <VideoUpload topicId={selectedTopic} onUploaded={refreshDetail} />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Resources</h3>
                {detail.resources.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No resources yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.resources.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(r.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <a
                          href={r.publicUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Open
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recordings</h3>
                {detail.recordings.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recordings yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.recordings.map((rec) => (
                      <li
                        key={rec.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {rec.title}
                        </p>
                        <a
                          href={rec.playerUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Watch
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quizzes</h3>
                {detail.quizzes.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No quizzes yet. Use the Quizzes page to create one for this topic.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.quizzes.map((q) => (
                      <li
                        key={q.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {q.title} {q._count?.Question ? `(${q._count.Question} q)` : ""}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            q.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {q.isActive ? "Active" : "Inactive"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3">
                  <a
                    href="/admin/quizzes"
                    className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm gap-2 border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  >
                    Manage quizzes
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function AdminContentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading content library…</div>}>
      <ContentManager />
    </Suspense>
  );
}
