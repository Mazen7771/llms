"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface QuizAttempt {
  id: string;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
}

interface Quiz {
  id: string;
  title: string;
  isActive: boolean;
  timeLimitSeconds: number | null;
  Topic: {
    id: string;
    name: string;
    Unit: { id: string; name: string; Subject: { name: string } };
  };
  _count: { Question: number; QuizAttempt: number };
  QuizAttempt: QuizAttempt[];
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQuizzes = useCallback(async () => {
    try {
      const res = await fetch("/api/student/quizzes");
      const data = await res.json();
      setQuizzes(data.quizzes ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadQuizzes().finally(() => setLoading(false)); }, [loadQuizzes]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Quizzes</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View and take quizzes from your enrolled subjects
        </p>
      </header>

      <div className="space-y-4">
        {quizzes.length === 0 ? (
          <Card variant="outlined" padding="lg">
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No quizzes available yet.
            </p>
          </Card>
        ) : (
          quizzes.map((quiz) => {
            const attempt = quiz.QuizAttempt[0];
            const hasAttempt = !!attempt;
            const submitted = attempt?.submittedAt != null;
            const score = attempt?.score;
            const maxScore = attempt?.maxScore;

            return (
              <Card
                key={quiz.id}
                variant="outlined"
                padding="lg"
                className="flex items-center justify-between gap-4"
              >
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
                      {quiz.isActive ? "Available" : "Closed"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {quiz.Topic.Unit.Subject.name} → {quiz.Topic.Unit.name} → {quiz.Topic.name}
                    &nbsp;·&nbsp;{quiz._count.Question} question{quiz._count.Question !== 1 ? "s" : ""}
                    {quiz.timeLimitSeconds ? ` · ${Math.ceil(quiz.timeLimitSeconds / 60)}min` : ""}
                  </p>
                  {hasAttempt && submitted && score !== null && maxScore !== null && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Your score:{" "}
                      <span className={`font-semibold ${
                        maxScore > 0 && score / maxScore >= 0.5
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {score}/{maxScore} ({Math.round((score / maxScore) * 100)}%)
                      </span>
                    </p>
                  )}
                  {hasAttempt && !submitted && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      In progress — started {new Date(attempt.startedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {!hasAttempt && quiz.isActive ? (
                    <Link
                      href={`/dashboard/quizzes/${quiz.id}`}
                      className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm gap-2 bg-primary text-white hover:opacity-90 transition-all"
                    >
                      Start Quiz
                    </Link>
                  ) : submitted ? (
                    <Link
                      href={`/dashboard/quizzes/${quiz.id}/results`}
                      className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm gap-2 border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                      View Results
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/quizzes/${quiz.id}`}
                      className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm gap-2 bg-primary text-white hover:opacity-90 transition-all"
                    >
                      Continue
                    </Link>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
