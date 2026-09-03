"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";

interface Topic {
  id: string;
  name: string;
  orderIndex: number;
  Resource: Array<{ id: string; title: string; fileType: string; publicUrl?: string }>;
  Recording: Array<{ id: string; title: string; streamVideoId: string; playerUrl?: string }>;
  __unit?: { id: string; name: string };
  Quiz: Array<{ id: string; title: string; isActive: boolean }>;
  Progress: Array<{ lessonViewed: boolean; recordingWatched: boolean; quizCompleted: boolean }>;
}

interface Unit {
  id: string;
  name: string;
  orderIndex: number;
  Topic: Topic[];
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  Unit: Unit[];
  _count: { Unit: number };
}

export default function ContentPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [expandedUnit, setExpandedUnit] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [topicDetail, setTopicDetail] = useState<{
    topic: Topic & {
      Unit: { name: string; Subject: { name: string } };
    };
    progress: { lessonViewed: boolean; recordingWatched: boolean; quizCompleted: boolean } | null;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadSubjects = useCallback(async () => {
    try {
      const res = await fetch("/api/student/subjects");
      const data = await res.json();
      setSubjects(data.subjects ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSubjects().finally(() => setLoading(false)); }, [loadSubjects]);

  const loadTopicDetail = useCallback(async (topicId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/student/progress/${topicId}`);
      const data = await res.json();
      setTopicDetail(data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  }, []);

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
    setTopicDetail(null);
    loadTopicDetail(topicId);
  };

  const markResourceViewed = async (topicId: string) => {
    try {
      await fetch(`/api/student/progress/${topicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonViewed: true }),
      });
      if (selectedTopic === topicId) loadTopicDetail(topicId);
    } catch { /* ignore */ }
  };

  const markRecordingWatched = async (topicId: string) => {
    try {
      await fetch(`/api/student/progress/${topicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingWatched: true }),
      });
      if (selectedTopic === topicId) loadTopicDetail(topicId);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  const selectedSubjectObj = subjects.find((s) => s.id === selectedSubject);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Browse Content</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Explore subjects, units, topics, resources, and recordings
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subjects sidebar */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subjects</h2>
          {subjects.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No subjects available yet.</p>
          )}
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedSubject(s.id);
                setExpandedUnit("");
                setSelectedTopic("");
                setTopicDetail(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                selectedSubject === s.id
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-primary/50"
              }`}
            >
              {s.name}
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {s._count.Unit} unit{s._count.Unit !== 1 ? "s" : ""}
              </span>
            </button>
          ))}
        </div>

        {/* Units + Topics */}
        <div className="space-y-3">
          {selectedSubjectObj ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedSubjectObj.name} — Units
              </h2>
              {selectedSubjectObj.Unit.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No units yet.</p>
              )}
              {selectedSubjectObj.Unit.map((u) => (
                <div key={u.id}>
                  <button
                    onClick={() => setExpandedUnit(expandedUnit === u.id ? "" : u.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      expandedUnit === u.id
                        ? "border-secondary bg-secondary/10 text-secondary font-semibold"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-secondary/50"
                    }`}
                  >
                    {u.name}
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {u.Topic.length} topic{u.Topic.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                  {expandedUnit === u.id && (
                    <div className="ml-4 mt-2 space-y-2">
                      {u.Topic.map((t) => {
                        const progress = t.Progress[0];
                        const completedSteps = [
                          progress?.lessonViewed,
                          progress?.recordingWatched,
                          progress?.quizCompleted,
                        ].filter(Boolean).length;

                        return (
                          <button
                            key={t.id}
                            onClick={() => handleTopicSelect(t.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                              selectedTopic === t.id
                                ? "border-accent bg-accent/10 text-accent font-medium"
                                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-accent/50"
                            }`}
                          >
                            <span className="flex items-center justify-between">
                              {t.name}
                              <span className="text-xs text-gray-500">
                                {completedSteps}/3
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              Select a subject to browse
            </div>
          )}
        </div>

        {/* Topic detail */}
        <div>
          {detailLoading && (
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          )}
          {!detailLoading && topicDetail && (
            <Card variant="outlined" padding="lg" className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {topicDetail.topic.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {topicDetail.topic.Unit.name} → {topicDetail.topic.Unit.Subject.name}
                </p>
                {topicDetail.progress && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {[
                      { key: "lessonViewed", label: "📄 Lesson viewed" },
                      { key: "recordingWatched", label: "🎥 Recording watched" },
                      { key: "quizCompleted", label: "✅ Quiz passed" },
                    ].map((step) => (
                      <span
                        key={step.key}
                        className={`text-xs px-2 py-1 rounded-full ${
                          topicDetail.progress?.[step.key as keyof typeof topicDetail.progress]
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  📄 Resources ({topicDetail.topic.Resource.length})
                </h3>
                {topicDetail.topic.Resource.length === 0 ? (
                  <p className="text-xs text-gray-500">No resources yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {topicDetail.topic.Resource.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
                      >
                        <span className="text-sm text-gray-900 dark:text-white truncate">{r.title}</span>
                        <a
                          href={r.publicUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markResourceViewed(topicDetail.topic.id)}
                          className="text-sm text-primary hover:underline shrink-0 ml-2"
                        >
                          Open
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recordings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  🎥 Recordings ({topicDetail.topic.Recording.length})
                </h3>
                {topicDetail.topic.Recording.length === 0 ? (
                  <p className="text-xs text-gray-500">No recordings yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {topicDetail.topic.Recording.map((rec) => (
                      <li
                        key={rec.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
                      >
                        <span className="text-sm text-gray-900 dark:text-white truncate">{rec.title}</span>
                        <a
                          href={rec.playerUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markRecordingWatched(topicDetail.topic.id)}
                          className="text-sm text-primary hover:underline shrink-0 ml-2"
                        >
                          Watch
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Quizzes */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  📝 Quizzes ({topicDetail.topic.Quiz.length})
                </h3>
                {topicDetail.topic.Quiz.length === 0 ? (
                  <p className="text-xs text-gray-500">No quizzes yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {topicDetail.topic.Quiz.map((q) => (
                      <li
                        key={q.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
                      >
                        <span className="text-sm text-gray-900 dark:text-white">{q.title}</span>
                        <a
                          href={`/dashboard/quizzes/${q.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Take quiz
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )}
          {!detailLoading && !topicDetail && selectedTopic && (
            <Card variant="outlined" padding="lg">
              <p className="text-center text-gray-400 py-8">Loading topic details…</p>
            </Card>
          )}
          {!selectedTopic && (
            <Card variant="outlined" padding="lg">
              <p className="text-center text-gray-400 py-8">
                Select a topic to view its content
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
