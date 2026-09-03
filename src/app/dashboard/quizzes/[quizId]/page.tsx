"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  prompt: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";
  marks: number;
  orderIndex: number;
  QuestionOption: Option[];
}

interface Quiz {
  id: string;
  title: string;
  timeLimitSeconds: number | null;
  Question: Question[];
  Topic: { name: string; Unit: { name: string; Subject: { name: string } } };
  QuizAttempt: Array<{
    id: string;
    submittedAt: string | null;
    startedAt: string;
    score: number | null;
    maxScore: number | null;
  }>;
}

interface AnswerState {
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string;
}

export default function QuizTakePage() {
  const { quizId } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const loadQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/student/quizzes?quizId=${quizId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load quiz");
      setQuiz(data.quiz);

      // Initialize answers
      setAnswers(
        data.quiz.Question.map((q: Question) => ({
          questionId: q.id,
          selectedOptionId: null,
          textAnswer: "",
        }))
      );

      // Start the attempt if not already started
      if (data.quiz.QuizAttempt.length === 0) {
        const startRes = await fetch(`/api/student/quizzes/${quizId}/start`, {
          method: "POST",
        });
        if (!startRes.ok) {
          const startData = await startRes.json();
          throw new Error(startData.error || "Failed to start quiz");
        }
      } else if (data.quiz.QuizAttempt[0].submittedAt) {
        // Already submitted — redirect to results
        router.replace(`/dashboard/quizzes/${quizId}/results`);
        return;
      }

      // Set timer if quiz has a time limit
      if (data.quiz.timeLimitSeconds) {
        const attempt = data.quiz.QuizAttempt[0];
        const startTime = attempt
          ? new Date(attempt.startedAt).getTime()
          : Date.now();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, data.quiz.timeLimitSeconds - elapsed);
        setTimeLeft(remaining);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading quiz");
    } finally {
      setLoading(false);
    }
  }, [quizId, router]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          handleSubmit(); // Auto-submit on timeout
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft !== null]); // re-run only when timer starts

  const selectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === questionId ? { ...a, selectedOptionId: optionId } : a
      )
    );
  };

  const setTextAnswer = (questionId: string, text: string) => {
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === questionId ? { ...a, textAnswer: text } : a
      )
    );
  };

  const handleSubmit = async () => {
    if (submitting || !quiz) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/student/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      router.push(`/dashboard/quizzes/${quizId}/results`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit error");
      setSubmitting(false);
    }
  };

  const answeredCount = answers.filter(
    (a) => a.selectedOptionId !== null || a.textAnswer.trim() !== ""
  ).length;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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

  if (!quiz || quiz.Question.length === 0) {
    return (
      <Card variant="outlined" padding="lg">
        <p className="text-center text-gray-500">Quiz not found or has no questions.</p>
      </Card>
    );
  }

  const q = quiz.Question[currentQuestion];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{quiz.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {quiz.Topic.Unit.Subject.name} → {quiz.Topic.Unit.name} → {quiz.Topic.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div
              className={`text-lg font-mono font-bold px-4 py-2 rounded-xl border ${
                timeLeft < 60
                  ? "text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20"
                  : "text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              }`}
            >
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {answeredCount}/{quiz.Question.length}
          </span>
        </div>
      </div>

      {/* Question navigation */}
      <div className="flex flex-wrap gap-2">
        {quiz.Question.map((question, i) => {
          const answer = answers.find((a) => a.questionId === question.id);
          const isAnswered =
            answer && (answer.selectedOptionId !== null || answer.textAnswer.trim() !== "");
          return (
            <button
              key={question.id}
              onClick={() => setCurrentQuestion(i)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                i === currentQuestion
                  ? "bg-primary text-white"
                  : isAnswered
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Current question */}
      <Card variant="outlined" padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
            Question {currentQuestion + 1} of {quiz.Question.length}
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {q.type.replace("_", " ")}
          </span>
          <span className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
        </div>

        <p className="text-gray-900 dark:text-white font-medium mb-6 whitespace-pre-wrap">{q.prompt}</p>

        {q.type === "MULTIPLE_CHOICE" && (
          <div className="space-y-3">
            {q.QuestionOption.map((opt, oi) => {
              const selected = answers.find((a) => a.questionId === q.id)?.selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => selectOption(q.id, opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    selected
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-primary/50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selected ? "border-primary bg-primary" : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {selected && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <span>{opt.text}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {(q.type === "SHORT_ANSWER" || q.type === "ESSAY") && (
          <textarea
            value={answers.find((a) => a.questionId === q.id)?.textAnswer ?? ""}
            onChange={(e) => setTextAnswer(q.id, e.target.value)}
            placeholder={q.type === "SHORT_ANSWER" ? "Type your answer…" : "Write your essay response…"}
            rows={q.type === "ESSAY" ? 8 : 3}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          variant="outline"
          disabled={currentQuestion === 0}
        >
          ← Previous
        </Button>
        {currentQuestion < quiz.Question.length - 1 ? (
          <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>
            Next →
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={submitting} className="bg-green-600 hover:bg-green-700">
            Submit Quiz
          </Button>
        )}
      </div>
    </div>
  );
}
