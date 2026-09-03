"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Topic {
  id: string;
  name: string;
  Unit: { id: string; name: string; Subject: { id: string; name: string } };
}

interface GeneratedOption {
  text: string;
  isCorrect: boolean;
}

interface GeneratedQuestion {
  prompt: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";
  marks: number;
  options: GeneratedOption[];
}

export default function GenerateQuizPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [questionType, setQuestionType] = useState("MULTIPLE_CHOICE");
  const [difficulty, setDifficulty] = useState("mixed");
  const [timeLimit, setTimeLimit] = useState("");

  // Generated questions (editable before saving)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [preview, setPreview] = useState(false);

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

  useEffect(() => { loadTopics().finally(() => setLoading(false)); }, [loadTopics]);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  const handleGenerate = async () => {
    if (!selectedTopic) return;
    setGenerating(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName: selectedTopic.name,
          subjectName: selectedTopic.Unit.Subject.name,
          unitName: selectedTopic.Unit.name,
          questionCount,
          questionTypes: [questionType],
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setQuestions(data.questions ?? []);
      setPreview(true);
      if (!quizTitle) {
        setQuizTitle(`${selectedTopic.name} Quiz`);
      }
      setToast(`Generated ${data.questions.length} questions`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Generation error");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTopicId || !quizTitle.trim() || questions.length === 0) return;
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedTopicId,
          title: quizTitle.trim(),
          timeLimitSeconds: timeLimit ? parseInt(timeLimit) : null,
          isActive: true,
          questions: questions.map((q, i) => ({
            prompt: q.prompt,
            type: q.type,
            marks: q.marks,
            orderIndex: i,
            options: q.options,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save quiz");
      setToast("Quiz created successfully! Redirecting…");
      setTimeout(() => router.push("/admin/quizzes"), 1200);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Save error");
    } finally {
      setSaving(false);
    }
  };

  const updateQuestion = (i: number, patch: Partial<GeneratedQuestion>) => {
    const copy = [...questions];
    copy[i] = { ...copy[i], ...patch };
    setQuestions(copy);
  };

  const updateOption = (qi: number, oi: number, patch: Partial<GeneratedOption>) => {
    const copy = [...questions];
    copy[qi].options = [...copy[qi].options];
    copy[qi].options[oi] = { ...copy[qi].options[oi], ...patch };
    if (patch.isCorrect) {
      copy[qi].options = copy[qi].options.map((o, idx) => ({
        ...o,
        isCorrect: idx === oi,
      }));
    }
    setQuestions(copy);
  };

  const removeQuestion = (i: number) => {
    setQuestions(questions.filter((_, idx) => idx !== i));
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
          <button
            onClick={() => router.push("/admin/quizzes")}
            className="text-sm text-primary hover:underline mb-1"
          >
            ← Back to quizzes
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">✨ AI Quiz Generator</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Use Gemini AI to generate quiz questions from topic context
          </p>
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

      {/* Configuration */}
      <Card variant="outlined" padding="lg">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic *</label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quiz Title</label>
            <input
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="Auto-filled from topic"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Questions</label>
            <input
              type="number"
              min={1}
              max={50}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              <option value="SHORT_ANSWER">Short Answer</option>
              <option value="ESSAY">Essay</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time limit (sec)</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              placeholder="No limit"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={handleGenerate} loading={generating} disabled={!selectedTopicId}>
            ✨ Generate Questions
          </Button>
        </div>
      </Card>

      {/* Preview / Edit generated questions */}
      {preview && questions.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preview &amp; Edit ({questions.length} questions)
            </h2>
            <Button onClick={handleSave} loading={saving}>
              Save Quiz to Database
            </Button>
          </div>

          <div className="space-y-4">
            {questions.map((q, qi) => (
              <Card key={qi} variant="outlined" padding="lg">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Q{qi + 1}</span>
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(qi, { type: e.target.value as GeneratedQuestion["type"] })}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="ESSAY">Essay</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={q.marks}
                      onChange={(e) => updateQuestion(qi, { marks: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white text-center"
                      title="Marks"
                    />
                    <span className="text-xs text-gray-500">marks</span>
                  </div>
                  <button
                    onClick={() => removeQuestion(qi)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={q.prompt}
                  onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-3"
                />
                {q.type === "MULTIPLE_CHOICE" && q.options.length > 0 && (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`gen-q-${qi}`}
                          checked={opt.isCorrect}
                          onChange={() => updateOption(qi, oi, { isCorrect: true })}
                          className="shrink-0"
                        />
                        <input
                          value={opt.text}
                          onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                          className="flex-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving}>
              Save Quiz to Database
            </Button>
          </div>
        </>
      )}

      {!preview && questions.length === 0 && (
        <Card variant="outlined" padding="lg">
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">
            Select a topic and click "Generate Questions" to start.
          </p>
        </Card>
      )}
    </div>
  );
}
