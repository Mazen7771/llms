"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Quiz {
  id: string;
  title: string;
  isActive: boolean;
  timeLimitSeconds: number | null;
  Topic: {
    id: string;
    name: string;
    Unit: { id: string; name: string; Subject: { id: string; name: string } };
  };
  _count: { Question: number; QuizAttempt: number };
}

interface Topic {
  id: string;
  name: string;
  Unit: { id: string; name: string; Subject: { id: string; name: string } };
}

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // New quiz form
  const [newTitle, setNewTitle] = useState("");
  const [newTopicId, setNewTopicId] = useState("");
  const [newTimeLimit, setNewTimeLimit] = useState("");
  const [creating, setCreating] = useState(false);

  const loadQuizzes = useCallback(async () => {
    try {
      const url = selectedTopic
        ? `/api/admin/quizzes?topicId=${encodeURIComponent(selectedTopic)}`
        : "/api/admin/quizzes";
      const res = await fetch(url);
      const data = await res.json();
      setQuizzes(data.quizzes ?? []);
    } catch { /* ignore */ }
  }, [selectedTopic]);

  const loadTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/subjects");
      const data = await res.json();
      const allTopics: Topic[] = [];
      for (const sub of data.subjects ?? []) {
        const unitRes = await fetch(`/api/admin/units?subjectId=${sub.id}`);
        const unitData = await unitRes.json();
        for (const unit of unitData.units ?? []) {
          for (const topic of unit.topics ?? []) {
            allTopics.push({
              ...topic,
              Unit: { id: unit.id, name: unit.name, Subject: { id: sub.id, name: sub.name } },
            });
          }
        }
      }
      setTopics(allTopics);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([loadQuizzes(), loadTopics()]).finally(() => setLoading(false));
  }, [loadQuizzes, loadTopics]);

  const createQuiz = async () => {
    if (!newTitle.trim() || !newTopicId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: newTopicId,
          title: newTitle.trim(),
          timeLimitSeconds: newTimeLimit ? parseInt(newTimeLimit) : null,
          isActive: true,
          questions: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create quiz");
      setToast(`Created quiz "${data.quiz.title}"`);
      setNewTitle("");
      setNewTopicId("");
      setNewTimeLimit("");
      setShowCreate(false);
      await loadQuizzes();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Error creating quiz");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (quiz: Quiz) => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !quiz.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update quiz");
      await loadQuizzes();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Error updating quiz");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create, edit, and manage quizzes across all topics
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/quizzes/generate"
            className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm gap-2 bg-secondary text-white hover:opacity-90 transition-all"
          >
            ✨ AI Generate
          </Link>
          <Button onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "+ New Quiz"}
          </Button>
        </div>
      </header>

      {toast && (
        <div
          className="p-4 rounded-xl border bg-primary/10 border-primary/30 text-gray-900 dark:text-white animate-slide-in"
          role="status"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <Card variant="outlined" padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Quiz</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Quiz title"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic *</label>
              <select
                value={newTopicId}
                onChange={(e) => setNewTopicId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select topic…</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.Unit.Subject.name} → {t.Unit.name} → {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time limit (seconds, optional)
              </label>
              <input
                type="number"
                value={newTimeLimit}
                onChange={(e) => setNewTimeLimit(e.target.value)}
                placeholder="e.g. 1800"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={createQuiz} loading={creating}>
              Create Quiz
            </Button>
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.Unit.Subject.name} → {t.Unit.name} → {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quiz list */}
      <div className="space-y-3">
        {quizzes.length === 0 ? (
          <Card variant="outlined" padding="lg">
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No quizzes found. Create one or use AI generation.
            </p>
          </Card>
        ) : (
          quizzes.map((quiz) => (
            <Card key={quiz.id} variant="outlined" padding="lg" className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {quiz.title}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      quiz.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {quiz.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {quiz.Topic.Unit.Subject.name} → {quiz.Topic.Unit.name} → {quiz.Topic.name}
                  &nbsp;·&nbsp;{quiz._count.Question} question{quiz._count.Question !== 1 ? "s" : ""}
                  &nbsp;·&nbsp;{quiz._count.QuizAttempt} attempt{quiz._count.QuizAttempt !== 1 ? "s" : ""}
                  {quiz.timeLimitSeconds ? ` · ${quiz.timeLimitSeconds}s limit` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/quizzes/${quiz.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Edit
                </Link>
                <button
                  onClick={() => toggleActive(quiz)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {quiz.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
