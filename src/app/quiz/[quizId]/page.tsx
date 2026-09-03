"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, Clock, AlertCircle, CheckCircle, X, ChevronRight, Flag, HelpCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  prompt: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";
  marks: number;
  orderIndex: number;
  QuestionOption: QuestionOption[];
}

interface Quiz {
  id: string;
  title: string;
  timeLimitSeconds: number | null;
  isActive: boolean;
  Topic: {
    id: string;
    name: string;
    slug: string;
    Unit: {
      id: string;
      name: string;
      slug: string;
      Subject: {
        id: string;
        name: string;
        slug: string;
      };
    };
  };
  Question: Question[];
}

interface StudentAnswer {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
}

interface Attempt {
  id: string;
  quizId: string;
  studentId: string;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
}

const STORAGE_KEY_PREFIX = "quiz_answers_";

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { quizId } = params;
  const attemptId = searchParams.get("attempt");

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Load quiz and attempt
  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  // Load flagged questions from localStorage once the quiz is known.
  useEffect(() => {
    if (!quizId) return;
    try {
      const raw = localStorage.getItem(`quiz_flagged_${quizId}`);
      if (raw) setFlaggedQuestions(new Set(JSON.parse(raw)));
    } catch {
      // Ignore corrupt storage
    }
  }, [quizId]);

  // Timer — set up the interval once when the quiz loads. The remaining time
  // is read via a ref inside the callback so the interval is NOT recreated on
  // every tick (which caused drift and wasted allocations).
  const timeRemainingRef = useRef<number | null>(null);
  useEffect(() => {
    if (timeRemaining !== null) timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  useEffect(() => {
    if (!quiz?.timeLimitSeconds || timeRemaining === null) return;

    timerRef.current = setInterval(() => {
      const current = timeRemainingRef.current;
      if (current === null || current <= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleTimeUp();
        return;
      }
      timeRemainingRef.current = current - 1;
      setTimeRemaining(current - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quiz?.timeLimitSeconds]);

  // Auto-save answers
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      saveAnswersToStorage();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1000);

    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [answers, quizId, attemptId]);

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`/api/student/quizzes/${quizId}`);
      if (res.ok) {
        const data = await res.json();
        setQuiz(data.quiz);

        // Initialize timer
        if (data.quiz.timeLimitSeconds) {
          setTimeRemaining(data.quiz.timeLimitSeconds);
        }

        // Load existing answers if attempt exists
        if (attemptId) {
          const attemptRes = await fetch(`/api/student/quizzes/${quizId}/attempt/${attemptId}`);
          if (attemptRes.ok) {
            const attemptData = await attemptRes.json();
            if (attemptData.answers) {
              const loadedAnswers: Record<string, StudentAnswer> = {};
              attemptData.answers.forEach((a: StudentAnswer) => {
                loadedAnswers[a.questionId] = a;
              });
              setAnswers(loadedAnswers);
            }
          }
        } else {
          // Load from localStorage
          const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${quizId}`);
          if (stored) {
            try {
              setAnswers(JSON.parse(stored));
            } catch {
              // Ignore parse errors
            }
          }
        }
      } else {
        setError("Quiz not found or not accessible");
      }
    } catch (err) {
      console.error("Failed to fetch quiz:", err);
      setError("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const saveAnswersToStorage = () => {
    if (!quizId) return;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${quizId}`, JSON.stringify(answers));
  };

  const handleAnswerChange = (questionId: string, answer: StudentAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleOptionSelect = (questionId: string, optionId: string) => {
    handleAnswerChange(questionId, { questionId, selectedOptionId: optionId });
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    handleAnswerChange(questionId, { questionId, textAnswer: text });
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (quiz?.Question.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (quiz?.Question.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleTimeUp = async () => {
    await submitQuiz(true);
  };

  const getAnsweredCount = () => {
    return Object.values(answers).filter((a) =>
      a.selectedOptionId || (a.textAnswer && a.textAnswer.trim())
    ).length;
  };

  const submitQuiz = async (autoSubmit = false) => {
    if (!quiz || submitting) return;

    if (!autoSubmit) {
      setShowSubmitConfirm(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const answerPayload = Object.values(answers).filter(
        (a) => a.selectedOptionId || (a.textAnswer && a.textAnswer.trim())
      );

      const res = await fetch(`/api/student/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers: answerPayload }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/quiz/${quizId}/results?attempt=${data.attempt.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit quiz");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const confirmSubmit = () => {
    submitQuiz(true);
  };

  const cancelSubmit = () => {
    setShowSubmitConfirm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" aria-busy="true">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unable to Load Quiz</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || "Quiz not found"}</p>
          <Link href="/dashboard" className="text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!quiz.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quiz Not Available</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">This quiz is currently not active.</p>
          <Link href="/dashboard" className="text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.Question[currentQuestionIndex];
  const totalQuestions = quiz.Question.length;
  const answeredCount = getAnsweredCount();
  const progress = (answeredCount / totalQuestions) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with timer */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-1 min-w-0 overflow-hidden" aria-label="Breadcrumb">
              <Link href="/dashboard" className="hover:text-primary truncate">Dashboard</Link>
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <Link href={`/dashboard/${quiz.Topic.Unit.Subject.slug}`} className="hover:text-primary truncate">{quiz.Topic.Unit.Subject.name}</Link>
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <Link href={`/dashboard/${quiz.Topic.Unit.Subject.slug}/${quiz.Topic.Unit.slug}`} className="hover:text-primary truncate">{quiz.Topic.Unit.name}</Link>
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <Link href={`/dashboard/${quiz.Topic.Unit.Subject.slug}/${quiz.Topic.Unit.slug}/${quiz.Topic.id}`} className="hover:text-primary truncate">{quiz.Topic.name}</Link>
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="text-gray-900 dark:text-white font-medium truncate">{quiz.title}</span>
            </nav>

            {/* Timer */}
            {quiz.timeLimitSeconds && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timeRemaining !== null && timeRemaining < 60 ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse" : "bg-gray-100 dark:bg-gray-800"}`}>
                <Clock className="w-5 h-5" />
                <span className="font-mono font-semibold text-lg tabular-nums">{formatTime(timeRemaining || 0)}</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
              <span className="text-gray-600 dark:text-gray-400">{answeredCount}/{totalQuestions} answered</span>
            </div>
            <Progress value={progress} size="sm" showLabel={false} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <Alert variant="error" className="mb-6" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Question Navigation */}
        <GlassCard variant="default" padding="sm" className="mb-6 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {quiz.Question.map((q, idx) => {
              const answer = answers[q.id];
              const isAnswered = answer?.selectedOptionId || (answer?.textAnswer && answer.textAnswer.trim());
              const isCurrent = idx === currentQuestionIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(idx)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all flex-shrink-0 ${
                    isCurrent
                      ? "bg-primary text-white ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900"
                      : isAnswered
                      ? "bg-success/10 text-success hover:bg-success/20 dark:bg-success/20"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                  aria-label={`Question ${idx + 1}${isAnswered ? " (answered)" : ""}${isCurrent ? " (current)" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isAnswered && !isCurrent ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* Question Content */}
        <GlassCard variant="strong" padding="lg" className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentQuestion.type === "MULTIPLE_CHOICE" ? "Multiple Choice" : currentQuestion.type === "SHORT_ANSWER" ? "Short Answer" : "Essay"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFlaggedQuestions((prev) => {
                  const next = new Set(prev);
                  if (next.has(currentQuestion.id)) {
                    next.delete(currentQuestion.id);
                  } else {
                    next.add(currentQuestion.id);
                  }
                  localStorage.setItem(`quiz_flagged_${quizId}`, JSON.stringify([...next]));
                  return next;
                });
              }}
              className={`text-gray-500 hover:text-yellow-500 ${flaggedQuestions.has(currentQuestion.id) ? "text-yellow-500" : ""}`}
              aria-label={flaggedQuestions.has(currentQuestion.id) ? "Unflag question" : "Flag for review"}
            >
              <Flag className="w-5 h-5" />
            </Button>
          </div>

          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="text-lg text-gray-900 dark:text-white">{currentQuestion.prompt}</p>
          </div>

          {/* Answer Input */}
          {currentQuestion.type === "MULTIPLE_CHOICE" && (
            <div className="space-y-3" role="radiogroup" aria-label="Answer options">
              {currentQuestion.QuestionOption.map((option) => {
                const isSelected = answers[currentQuestion.id]?.selectedOptionId === option.id;
                return (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question_${currentQuestion.id}`}
                      value={option.id}
                      checked={isSelected}
                      onChange={() => handleOptionSelect(currentQuestion.id, option.id)}
                      className="w-5 h-5 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    />
                    <span className="text-gray-900 dark:text-white flex-1">{option.text}</span>
                  </label>
                );
              })}
            </div>
          )}

          {currentQuestion.type === "SHORT_ANSWER" && (
            <Input
              id={`answer_${currentQuestion.id}`}
              value={answers[currentQuestion.id]?.textAnswer || ""}
              onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full"
              autoComplete="off"
            />
          )}

          {currentQuestion.type === "ESSAY" && (
            <textarea
              id={`answer_${currentQuestion.id}`}
              value={answers[currentQuestion.id]?.textAnswer || ""}
              onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
              placeholder="Write your essay response here..."
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[200px] resize-y"
              rows={10}
              autoComplete="off"
            />
          )}

          {/* Question Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={prevQuestion} disabled={currentQuestionIndex === 0} icon={<ChevronLeft className="w-4 h-4" />}>
              Previous
            </Button>

            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {saved && <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><Save className="w-3 h-3" /> Saved</span>}
            </div>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <Button onClick={() => setShowSubmitConfirm(true)} loading={submitting} className="bg-primary hover:bg-primary/90">
                Submit Quiz
              </Button>
            ) : (
              <Button onClick={nextQuestion} icon={<ChevronRight className="w-4 h-4" />} iconPosition="right">
                Next
              </Button>
            )}
          </div>
        </GlassCard>

        {/* Submit Confirmation Modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="submit-dialog-title">
            <GlassCard variant="strong" padding="lg" className="w-full max-w-md">
              <h2 id="submit-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2">Submit Quiz?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You have answered {answeredCount} out of {totalQuestions} questions.
                {answeredCount < totalQuestions && (
                  <span className="text-warning font-medium"> {totalQuestions - answeredCount} unanswered.</span>
                )}
                Once submitted, you cannot change your answers.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={cancelSubmit}>Cancel</Button>
                <Button onClick={confirmSubmit} loading={submitting} className="bg-primary hover:bg-primary/90">
                  Confirm Submit
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </main>
    </div>
  );
}