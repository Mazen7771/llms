"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Download, Filter, FileText, BarChart2, Target } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface TopicProgress {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  recordingsCount: number;
  hasQuiz: boolean;
  progress: {
    lessonViewed: boolean;
    recordingWatched: boolean;
    quizCompleted: boolean;
    updatedAt: string | null;
  };
  latestAttempt: {
    id: string;
    score: number | null;
    maxScore: number | null;
    submittedAt: string | null;
    percentage: number | null;
  } | null;
  attemptsCount: number;
}

interface UnitProgress {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  topics: TopicProgress[];
  totalTopics: number;
  completedTopics: number;
  progress: number;
}

interface SubjectProgress {
  id: string;
  name: string;
  slug: string;
  units: UnitProgress[];
}

interface Student {
  id: string;
  name: string | null;
  email: string;
}

interface ProgressData {
  student: Student;
  subjects: SubjectProgress[];
}

export default function StudentProgressPage() {
  const params = useParams();
  const { id: studentId } = params;

  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "in-progress" | "not-started">("all");

  useEffect(() => {
    fetchProgress();
  }, [studentId]);

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/progress`);
      if (res.ok) {
        const data = await res.json();
        setData(data);
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOverallStats = () => {
    if (!data) return { total: 0, completed: 0, inProgress: 0, notStarted: 0, avgScore: 0 };

    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    let totalScore = 0;
    let scoredAttempts = 0;

    data.subjects.forEach((subject) => {
      subject.units.forEach((unit) => {
        unit.topics.forEach((topic) => {
          total++;
          const p = topic.progress;
          const hasQuiz = topic.hasQuiz;
          const recordingsCount = topic.recordingsCount;

          const isCompleted =
            p.lessonViewed &&
            (recordingsCount === 0 || p.recordingWatched) &&
            (!hasQuiz || p.quizCompleted);

          const hasStarted = p.lessonViewed || (recordingsCount > 0 && p.recordingWatched) || (hasQuiz && p.quizCompleted);

          if (isCompleted) {
            completed++;
          } else if (hasStarted) {
            inProgress++;
          } else {
            notStarted++;
          }

          if (topic.latestAttempt && topic.latestAttempt.percentage !== null) {
            totalScore += topic.latestAttempt.percentage;
            scoredAttempts++;
          }
        });
      });
    });

    return {
      total,
      completed,
      inProgress,
      notStarted,
      avgScore: scoredAttempts > 0 ? Math.round(totalScore / scoredAttempts) : 0,
    };
  };

  const getFilteredTopics = () => {
    if (!data) return [];

    const topics: Array<{ topic: TopicProgress; subject: SubjectProgress; unit: UnitProgress }> = [];

    data.subjects.forEach((subject) => {
      if (filterSubject !== "all" && subject.id !== filterSubject) return;

      subject.units.forEach((unit) => {
        unit.topics.forEach((topic) => {
          const p = topic.progress;
          const hasQuiz = topic.hasQuiz;
          const recordingsCount = topic.recordingsCount;

          const isCompleted =
            p.lessonViewed &&
            (recordingsCount === 0 || p.recordingWatched) &&
            (!hasQuiz || p.quizCompleted);

          const hasStarted = p.lessonViewed || (recordingsCount > 0 && p.recordingWatched) || (hasQuiz && p.quizCompleted);

          let status: "completed" | "in-progress" | "not-started";
          if (isCompleted) status = "completed";
          else if (hasStarted) status = "in-progress";
          else status = "not-started";

          if (filterStatus !== "all" && filterStatus !== status) return;

          topics.push({ topic, subject, unit });
        });
      });
    });

    return topics;
  };

  const stats = getOverallStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" aria-busy="true">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Failed to load progress</h1>
          <Link href="/admin/students" className="mt-4 text-primary hover:underline">Back to Students</Link>
        </div>
      </div>
    );
  }

  const { student, subjects } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/admin" className="hover:text-primary">Admin</Link>
          <ChevronLeft className="w-4 h-4" />
          <Link href="/admin/students" className="hover:text-primary">Students</Link>
          <ChevronLeft className="w-4 h-4" />
          <Link href={`/admin/students/${studentId}`} className="hover:text-primary">
            {student.name || student.email}
          </Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white font-medium">Progress</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline">{student.name || student.email}</Badge>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Learning Progress</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Detailed topic-by-topic progress tracking</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <GlassCard variant="default" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Topics</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <BarChart2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
          </GlassCard>
          <GlassCard variant="default" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-success">{stats.completed}</p>
              </div>
              <Target className="w-8 h-8 text-success" />
            </div>
          </GlassCard>
          <GlassCard variant="default" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-warning">{stats.inProgress}</p>
              </div>
              <Target className="w-8 h-8 text-warning" />
            </div>
          </GlassCard>
          <GlassCard variant="default" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Quiz Score</p>
                <p className="text-2xl font-bold text-primary">{stats.avgScore}%</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </GlassCard>
        </div>

        {/* Filters */}
        <GlassCard variant="default" padding="md" className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-48 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "completed" | "in-progress" | "not-started")}
              className="w-40 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="not-started">Not Started</option>
            </select>
          </div>
        </GlassCard>

        {/* Subject Accordions */}
        <div className="space-y-4">
          {subjects.map((subject) => (
            <GlassCard key={subject.id} variant="default" className="overflow-hidden">
              <button
                onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
                className="w-full flex items-center justify-between p-4 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                aria-expanded={expandedSubject === subject.id}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedSubject === subject.id ? "rotate-90" : ""}`}
                  />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{subject.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {subject.units.length} units · {subject.units.reduce((sum, u) => sum + u.totalTopics, 0)} topics
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary dark:text-primary-light tabular-nums">
                    {subject.units.reduce((sum, u) => sum + u.completedTopics, 0)}/{subject.units.reduce((sum, u) => sum + u.totalTopics, 0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {subject.units.reduce((sum, u) => sum + u.totalTopics, 0) > 0
                      ? Math.round(
                          (subject.units.reduce((sum, u) => sum + u.completedTopics, 0) /
                            subject.units.reduce((sum, u) => sum + u.totalTopics, 0)) *
                            100
                        )
                      : 0}% Complete
                  </div>
                </div>
              </button>

              {expandedSubject === subject.id && (
                <div className="border-t border-white/10 dark:border-gray-700/50">
                  {subject.units.map((unit) => (
                    <div key={unit.id} className="border-t border-white/5 dark:border-gray-800/50">
                      <button
                        onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800/50"
                        aria-expanded={expandedUnit === unit.id}
                      >
                        <div className="flex items-center gap-3">
                          <ChevronRight
                            className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${expandedUnit === unit.id ? "rotate-90" : ""}`}
                          />
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Unit {unit.orderIndex}: {unit.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {unit.totalTopics} topics · {unit.completedTopics} completed
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                            {unit.completedTopics}/{unit.totalTopics}
                          </div>
                          <Progress value={unit.progress} max={100} size="sm" showLabel={false} className="w-32 mt-1" />
                        </div>
                      </button>

                      {expandedUnit === unit.id && (
                        <div className="px-4 pb-4">
                          <div className="space-y-2 mt-2">
                            {unit.topics
                              .filter((topic) => {
                                if (filterSubject !== "all" && subject.id !== filterSubject) return false;
                                const p = topic.progress;
                                const hasQuiz = topic.hasQuiz;
                                const recordingsCount = topic.recordingsCount;
                                const isCompleted =
                                  p.lessonViewed &&
                                  (recordingsCount === 0 || p.recordingWatched) &&
                                  (!hasQuiz || p.quizCompleted);
                                const hasStarted = p.lessonViewed || (recordingsCount > 0 && p.recordingWatched) || (hasQuiz && p.quizCompleted);
                                let status: "completed" | "in-progress" | "not-started";
                                if (isCompleted) status = "completed";
                                else if (hasStarted) status = "in-progress";
                                else status = "not-started";
                                if (filterStatus !== "all" && filterStatus !== status) return false;
                                return true;
                              })
                              .map((topic) => {
                                const p = topic.progress;
                                const hasQuiz = topic.hasQuiz;
                                const recordingsCount = topic.recordingsCount;

                                const isCompleted =
                                  p.lessonViewed &&
                                  (recordingsCount === 0 || p.recordingWatched) &&
                                  (!hasQuiz || p.quizCompleted);

                                const hasStarted = p.lessonViewed || (recordingsCount > 0 && p.recordingWatched) || (hasQuiz && p.quizCompleted);

                                let status: "completed" | "in-progress" | "not-started";
                                if (isCompleted) status = "completed";
                                else if (hasStarted) status = "in-progress";
                                else status = "not-started";

                                return (
                                  <GlassCard
                                    key={topic.id}
                                    variant={status === "completed" ? "subtle" : "default"}
                                    padding="sm"
                                    className="flex items-center justify-between gap-4"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                          status === "completed"
                                            ? "bg-success/10 text-success"
                                            : status === "in-progress"
                                            ? "bg-warning/10 text-warning"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                        }`}
                                      >
                                        {status === "completed" ? (
                                          <Eye className="w-4 h-4" />
                                        ) : status === "in-progress" ? (
                                          <Target className="w-4 h-4" />
                                        ) : (
                                          <FileText className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{topic.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                          {recordingsCount > 0 && (
                                            <span>{recordingsCount} recording{recordingsCount !== 1 ? "s" : ""}</span>
                                          )}
                                          {hasQuiz && <span className="text-primary">Quiz available</span>}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      <Badge
                                        variant={
                                          status === "completed"
                                            ? "success"
                                            : status === "in-progress"
                                            ? "warning"
                                            : "outline"
                                        }
                                      >
                                        {status === "completed"
                                          ? "Completed"
                                          : status === "in-progress"
                                          ? "In Progress"
                                          : "Not Started"}
                                      </Badge>
                                      {topic.latestAttempt && topic.latestAttempt.percentage !== null && (
                                        <Badge variant="outline" className="text-primary">
                                          {topic.latestAttempt.percentage}%
                                        </Badge>
                                      )}
                                      {topic.latestAttempt && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => window.open(`/admin/quiz-attempts/${topic.latestAttempt?.id}`, "_blank")}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </GlassCard>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          ))}
        </div>

        {subjects.length === 0 && (
          <GlassCard variant="default" padding="xl" className="text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No content yet</h3>
            <p className="text-gray-500 dark:text-gray-400">No subjects or topics have been created.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}