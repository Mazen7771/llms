"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id?: string;
  prompt: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";
  marks: number;
  orderIndex: number;
  options: Option[];
}

interface Quiz {
  id: string;
  title: string;
  isActive: boolean;
  timeLimitSeconds: number | null;
  Topic: { id: string; name: string; Unit: { name: string; Subject: { name: string } } };
  Question: Array<{
    id: string;
    prompt: string;
    type: string;
    marks: number;
    orderIndex: number;
    QuestionOption: Array<{ id: string; text: string; isCorrect: boolean }>;
  }>;
}

export default function QuizEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/quizzes/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load quiz");
      const q: Quiz = data.quiz;
      setQuiz(q);
      setTitle(q.title);
      setTimeLimit(q.timeLimitSeconds?.toString() ?? "");
      setQuestions(
        q.Question.sort((a, b) => a.orderIndex - b.orderIndex).map((question) => ({
          id: question.id,
          prompt: question.prompt,
          type: question.type as Question["type"],
          marks: question.marks,
          orderIndex: question.orderIndex,
          options: question.QuestionOption.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        }))
      );
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Error loading quiz");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        prompt: "",
        type: "MULTIPLE_CHOICE",
        marks: 1,
        orderIndex: questions.length,
        options: [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
      },
    ]);
  };

  const updateQuestion = (i: number, patch: Partial<Question>) => {
    const copy = [...questions];
    copy[i] = { ...copy[i], ...patch };
    if (patch.type && patch.type !== "MULTIPLE_CHOICE") {
      copy[i].options = [];
    } else if (patch.type === "MULTIPLE_CHOICE" && copy[i].options.length === 0) {
      copy[i].options = [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ];
    }
    setQuestions(copy);
  };

  const updateOption = (qi: number, oi: number, patch: Partial<Option>) => {
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

  const saveQuiz = async () => {
    if (!quiz) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/quizzes/${quiz.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          timeLimitSeconds: timeLimit ? parseInt(timeLimit) : null,
          questions: questions.map((q, i) => ({
            prompt: q.prompt,
            type: q.type,
            marks: q.marks,
            orderIndex: i,
            options: q.options.map((o) => ({
              text: o.text,
              isCorrect: o.isCorrect,
            })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setToast("Quiz saved successfully");
      await loadQuiz();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Error saving quiz");
    } finally {
      setSaving(false);
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

  if (!quiz) {
    return (
      <Card variant="outlined" padding="lg">
        <p className="text-center text-gray-500">Quiz not found.</p>
        <div className="mt-4 text-center">
          <Button onClick={() => router.push("/admin/quizzes")}>Back to quizzes</Button>
        </div>
      </Card>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Quiz</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {quiz.Topic.Unit.Subject.name} → {quiz.Topic.Unit.name} → {quiz.Topic.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveQuiz} loading={saving}>
            Save changes
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

      <Card variant="outlined" padding="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time limit (seconds)
            </label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              placeholder="No limit"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <Card key={qi} variant="outlined" padding="lg">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Q{qi + 1}</span>
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(qi, { type: e.target.value as Question["type"] })}
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
              placeholder="Question prompt…"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 mb-3"
            />
            {q.type === "MULTIPLE_CHOICE" && (
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q-${qi}-correct`}
                      checked={opt.isCorrect}
                      onChange={() => updateOption(qi, oi, { isCorrect: true })}
                      className="shrink-0"
                      title="Correct answer"
                    />
                    <input
                      value={opt.text}
                      onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      className="flex-1 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Button onClick={addQuestion} variant="outline">
        + Add Question
      </Button>
    </div>
  );
}
