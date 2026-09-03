"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle, X, AlertCircle, Award, Clock, Download, RotateCcw, ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

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

interface StudentAnswer {
  id: string;
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  marksAwarded: number;
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

interface Quiz {
  id: string;
  title: string;
  timeLimitSeconds: number | null;
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

interface ResultsData {
  quiz: Quiz;
  attempt: Attempt;
  answers: StudentAnswer[];
}

export default function QuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { quizId } = params;
  const attemptId = searchParams.get("attempt");

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchResults();
  }, [quizId, attemptId]);

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/student/quizzes/${quizId}/results?attemptId=${attemptId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        setError("Failed to load results");
      }
    } catch (err) {
      console.error("Failed to fetch results:", err);
      setError("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeTaken = (startedAt: string, submittedAt: string | null) => {
    if (!submittedAt) return "N/A";
    const diff = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
    return formatTime(Math.floor(diff / 1000));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" aria-busy="true">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unable to Load Results</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || "Results not found"}</p>
          <Link href="/dashboard" className="text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const { quiz, attempt, answers } = data;
  const percentage = attempt.score !== null && attempt.maxScore !== null
    ? Math.round((attempt.score / attempt.maxScore) * 100)
    : attempt.score !== null
    ? 100
    : 0;

  const isPassed = attempt.score !== null && attempt.maxScore !== null && percentage >= 60;
  const needsManualGrading = quiz.Question.some((q) => q.type !== "MULTIPLE_CHOICE") && attempt.score === null;

  // Calculate stats
  const multipleChoiceQuestions = quiz.Question.filter((q) => q.type === "MULTIPLE_CHOICE");
  const mcAnswered = answers.filter((a) => multipleChoiceQuestions.some((q) => q.id === a.questionId));
  const mcCorrect = mcAnswered.filter((a) => a.isCorrect === true).length;
  const mcTotal = multipleChoiceQuestions.length;

  const shortAnswerQuestions = quiz.Question.filter((q) => q.type !== "MULTIPLE_CHOICE");
  const saAnswered = answers.filter((a) => shortAnswerQuestions.some((q) => q.id === a.questionId && a.textAnswer));
  const saPending = shortAnswerQuestions.length - saAnswered.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
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
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="text-primary font-medium">Results</span>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Score Summary */}
        <GlassCard variant="strong" padding="xl" className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            {needsManualGrading ? (
              <AlertCircle className="w-10 h-10 text-warning" />
            ) : isPassed ? (
              <CheckCircle className="w-10 h-10 text-success" />
            ) : (
              <X className="w-10 h-10 text-error" />
            )}
            <Award className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{quiz.title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {quiz.Topic.Unit.Subject.name} › {quiz.Topic.Unit.name} › {quiz.Topic.name}
          </p>

          {/* Main Score Display */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-6">
            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  className="dark:stroke-gray-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={needsManualGrading ? "#f59e0b" : isPassed ? "#10b981" : "#ef4444"}
                  strokeWidth="8"
                  strokeDasharray={283}
                  strokeDashoffset={283 - (283 * percentage) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{percentage}%</span>
                {needsManualGrading && (
                  <span className="text-xs text-warning font-medium mt-1">Pending Grading</span>
                )}
              </div>
            </div>

            <div className="text-center md:text-left">
              {attempt.score !== null && attempt.maxScore !== null && !needsManualGrading ? (
                <>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {attempt.score} / {attempt.maxScore} marks
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                    {mcCorrect} / {mcTotal} multiple choice correct
                  </p>
                </>
              ) : needsManualGrading ? (
                <>
                  <p className="text-2xl font-bold text-warning">Awaiting Manual Grading</p>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                    {mcCorrect} / {mcTotal} multiple choice correct
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {shortAnswerQuestions.length} question(s) need teacher review
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">Not Scored</p>
                </>
              )}

              <div className="mt-4 flex items-center justify-center md:justify-start gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Submitted: {new Date(attempt.submittedAt!).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Time taken: {getTimeTaken(attempt.startedAt, attempt.submittedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Pass/Fail Badge */}
          {!needsManualGrading && attempt.score !== null && (
            <Badge variant={isPassed ? "success" : "error"} size="lg" className="mt-4 inline-flex items-center gap-2">
              {isPassed ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {isPassed ? "Passed (≥60%)" : "Needs Improvement (<60%)"}
            </Badge>
          )}

          {needsManualGrading && (
            <Badge variant="warning" size="lg" className="mt-4 inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Pending Teacher Grading
            </Badge>
          )}
        </GlassCard>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <GlassCard variant="default" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Multiple Choice</p>
                <p className="text-2xl font-bold text-primary">{mcCorrect}/{mcTotal} correct</p>
              </div>
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <Progress value={mcTotal > 0 ? (mcCorrect / mcTotal) * 100 : 0} size="sm" showLabel={true} className="mt-2" />
          </GlassCard>
          <GlassCard variant="default" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Short Answer / Essay</p>
                <p className="text-2xl font-bold text-warning">{saAnswered.length}/{shortAnswerQuestions.length} answered</p>
              </div>
              <AlertCircle className="w-8 h-8 text-warning" />
            </div>
            <Progress value={shortAnswerQuestions.length > 0 ? (saAnswered.length / shortAnswerQuestions.length) * 100 : 0} size="sm" showLabel={true} className="mt-2" />
          </GlassCard>
          <GlassCard variant="default" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {attempt.score !== null && attempt.maxScore !== null ? `${attempt.score}/{attempt.maxScore}` : "Pending"}
                </p>
              </div>
              <Award className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <Progress value={attempt.maxScore && attempt.score !== null ? (attempt.score / attempt.maxScore) * 100 : 0} size="sm" showLabel={true} className="mt-2" />
          </GlassCard>
        </div>

        {/* Question Review */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            Detailed Review
          </h2>

          {quiz.Question.map((question, idx) => {
            const answer = answers.find((a) => a.questionId === question.id);
            const isExpanded = expandedQuestions.has(question.id);
            const correctOption = question.QuestionOption.find((opt) => opt.isCorrect);
            const selectedOption = answer?.selectedOptionId ? question.QuestionOption.find((opt) => opt.id === answer.selectedOptionId) : null;

            let questionStatus: "correct" | "incorrect" | "pending" | "unanswered";
            if (!answer || (!answer.selectedOptionId && !answer.textAnswer)) {
              questionStatus = "unanswered";
            } else if (question.type === "MULTIPLE_CHOICE") {
              questionStatus = answer.isCorrect === true ? "correct" : "incorrect";
            } else {
              questionStatus = "pending";
            }

            const statusColors = {
              correct: { bg: "bg-success/10", border: "border-success/30", text: "text-success", icon: CheckCircle },
              incorrect: { bg: "bg-error/10", border: "border-error/30", text: "text-error", icon: X },
              pending: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", icon: AlertCircle },
              unanswered: { bg: "bg-gray-100 dark:bg-gray-800", border: "border-gray-200 dark:border-gray-700", text: "text-gray-500 dark:text-gray-400", icon: AlertCircle },
            };

            const colors = statusColors[questionStatus];

            return (
              <GlassCard
                key={question.id}
                variant="default"
                className={`${colors.bg} ${colors.border} border overflow-hidden`}
              >
                {/* Question Header */}
                <button
                  onClick={() => toggleQuestion(question.id)}
                  className="w-full px-4 py-4 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.text}`}>
                      <colors.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        Q{idx + 1}: {question.prompt}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <Badge variant="outline" className="text-xs">
                          {question.type === "MULTIPLE_CHOICE" ? "Multiple Choice" : question.type === "SHORT_ANSWER" ? "Short Answer" : "Essay"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.marks} mark{question.marks !== 1 ? "s" : ""}
                        </Badge>
                        <span className={`font-medium ${colors.text}`}>
                          {questionStatus === "correct" && `+${answer?.marksAwarded || question.marks} marks`}
                          {questionStatus === "incorrect" && `0/${question.marks} marks`}
                          {questionStatus === "pending" && "Pending grading"}
                          {questionStatus === "unanswered" && "Not answered"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronLeft
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>

                {/* Expanded Answer Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/10 dark:border-gray-700/50">
                    <div className="space-y-4 mt-4">
                      {/* Student's Answer */}
                      <div className={`p-4 rounded-lg ${colors.bg} ${colors.border} border`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">Your Answer:</span>
                          {questionStatus === "correct" && <CheckCircle className="w-4 h-4 text-success" />}
                          {questionStatus === "incorrect" && <X className="w-4 h-4 text-error" />}
                          {questionStatus === "pending" && <AlertCircle className="w-4 h-4 text-warning" />}
                          {questionStatus === "unanswered" && <span className="text-gray-500 dark:text-gray-400 text-sm">Not answered</span>}
                        </div>

                        {question.type === "MULTIPLE_CHOICE" && selectedOption && (
                          <p className="text-gray-900 dark:text-white">{selectedOption.text}</p>
                        )}

                        {(question.type === "SHORT_ANSWER" || question.type === "ESSAY") && answer?.textAnswer && (
                          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{answer.textAnswer}</p>
                        )}

                        {(question.type === "SHORT_ANSWER" || question.type === "ESSAY") && !answer?.textAnswer && (
                          <p className="text-gray-500 dark:text-gray-400 italic">No answer provided</p>
                        )}
                      </div>

                      {/* Correct Answer */}
                      {question.type === "MULTIPLE_CHOICE" && correctOption && (
                        <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="font-medium text-gray-900 dark:text-white">Correct Answer:</span>
                          </div>
                          <p className="text-gray-900 dark:text-white">{correctOption.text}</p>
                        </div>
                      )}

                      {/* Explanation placeholder */}
                      {/* In future, add explanation field to Question model */}
                    </div>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href={`/dashboard/${quiz.Topic.Unit.Subject.slug}/${quiz.Topic.Unit.slug}/${quiz.Topic.id}`}>
            <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Topic
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
              Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}