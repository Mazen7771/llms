"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Answer {
  questionId: string;
  prompt: string;
  type: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  marksAwarded: number;
  correctOptionId: string | null;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
}

interface Results {
  attemptId: string;
  score: number;
  maxScore: number;
  percentage: number;
  answers: Answer[];
  quiz: {
    id: string;
    title: string;
    Topic: { name: string; Unit: { name: string; Subject: { name: string } } };
  };
}

export default function QuizResultsPage() {
  const { quizId } = useParams();
  const router = useRouter();
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResults = useCallback(async () => {
    try {
      // Fetch the quiz to get the attempt results
      const res = await fetch(`/api/student/quizzes?quizId=${quizId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load results");

      const quiz = data.quiz;
      const attempt = quiz.QuizAttempt?.[0];

      if (!attempt?.submittedAt) {
        // No submitted attempt — redirect to quiz
        router.replace(`/dashboard/quizzes/${quizId}`);
        return;
      }

      // We need to get the graded answers — fetch them via the quiz attempt
      const submitRes = await fetch(`/api/student/quizzes/${quizId}/results`);
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || "Failed to load results");

      setResults({
        ...submitData,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          Topic: quiz.Topic,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading results");
    } finally {
      setLoading(false);
    }
  }, [quizId, router]);

  useEffect(() => { loadResults(); }, [loadResults]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" padding="lg">
        <p className="text-center text-red-500">{error}</p>
        <div className="mt-4 text-center">
          <Button onClick={() => router.push("/dashboard/quizzes")}>Back to quizzes</Button>
        </div>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card variant="outlined" padding="lg">
        <p className="text-center text-gray-500">No results found.</p>
      </Card>
    );
  }

  const passed = results.percentage >= 50;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/dashboard/quizzes")}
            className="text-sm text-primary hover:underline mb-1"
          >
            ← Back to quizzes
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Results</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {results.quiz.title} — {results.quiz.Topic.Unit.Subject.name}
          </p>
        </div>
      </header>

      {/* Score summary */}
      <Card variant="outlined" padding="lg" className="text-center">
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold mb-4 ${
            passed
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {results.percentage}%
        </div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          {results.score}/{results.maxScore} marks
        </p>
        <p className={`text-sm mt-1 ${passed ? "text-green-600" : "text-red-600"}`}>
          {passed ? "🎉 You passed!" : "Keep studying — you'll get it next time."}
        </p>
      </Card>

      {/* Detailed answers */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Review</h2>
        {results.answers.map((answer, i) => (
          <Card key={answer.questionId} variant="outlined" padding="lg">
            <div className="flex items-start gap-3">
              <span
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  answer.isCorrect === true
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : answer.isCorrect === false
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {answer.isCorrect === true ? "✓" : answer.isCorrect === false ? "✗" : "?"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2 whitespace-pre-wrap">
                  Q{i + 1}. {answer.prompt}
                </p>
                {answer.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-1">
                    {answer.options.map((opt) => {
                      const isSelected = answer.selectedOptionId === opt.id;
                      const isCorrectOption = opt.id === answer.correctOptionId;
                      return (
                        <div
                          key={opt.id}
                          className={`text-sm px-3 py-1.5 rounded-lg border ${
                            isCorrectOption
                              ? "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                              : isSelected && !isCorrectOption
                              ? "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {isSelected && "→ "}
                          {opt.text}
                          {isCorrectOption && " ✓"}
                        </div>
                      );
                    })}
                  </div>
                )}
                {(answer.type === "SHORT_ANSWER" || answer.type === "ESSAY") && (
                  <div className="space-y-1">
                    <div className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      Your answer: {answer.textAnswer || <em className="text-gray-400">No answer</em>}
                    </div>
                    {answer.correctOptionId && (
                      <div className="text-sm px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                        Correct answer: {answer.options.find((o) => o.id === answer.correctOptionId)?.text}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {answer.marksAwarded}/{answer.type === "ESSAY" ? "pending review" : 1} marks
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Link
          href="/dashboard/quizzes"
          className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm gap-2 border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          Back to quizzes
        </Link>
      </div>
    </div>
  );
}
