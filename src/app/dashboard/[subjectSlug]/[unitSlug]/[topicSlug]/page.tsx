"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Play, FileText, CheckCircle, Clock, ChevronLeft, Download, Eye, BarChart2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";

interface Resource {
  id: string;
  title: string;
  description?: string;
  type: string;
  fileKey: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface Recording {
  id: string;
  title: string;
  description?: string;
  streamVideoId: string;
  durationSeconds?: number;
  recordedDate?: string;
  createdAt: string;
}

interface Quiz {
  id: string;
  title: string;
  timeLimitSeconds?: number;
  isActive: boolean;
  Question: { id: string }[];
  _count: { select: { Question: true; QuizAttempt: true } };
  QuizAttempt: { id: string; startedAt: string; submittedAt?: string; score?: number; maxScore?: number }[];
}

interface TopicProgress {
  lessonViewed: boolean;
  recordingWatched: boolean;
  quizCompleted: boolean;
}

interface TopicData {
  id: string;
  name: string;
  orderIndex: number;
  Unit: {
    id: string;
    name: string;
    slug: string;
    orderIndex: number;
    Subject: {
      id: string;
      name: string;
      slug: string;
    };
  };
  Resource: Resource[];
  Recording: Recording[];
  Quiz: Quiz[];
  Progress: TopicProgress | null;
}

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { subjectSlug, unitSlug, topicSlug } = params;

  const [topic, setTopic] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"resources" | "recordings" | "quiz">("resources");
  const [progress, setProgress] = useState<TopicProgress>({ lessonViewed: false, recordingWatched: false, quizCompleted: false });
  const [quizLoading, setQuizLoading] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    fetchTopic();
  }, [subjectSlug, unitSlug, topicSlug]);

  const fetchTopic = async () => {
    try {
      const res = await fetch(`/api/student/progress/${topicSlug}`);
      if (res.ok) {
        const data = await res.json();
        setTopic(data.topic);
        if (data.progress) {
          setProgress(data.progress);
        }
        // Auto-select first available tab
        if (data.topic?.Recording?.length > 0 && activeTab === "resources" && data.topic.Resource.length === 0) {
          setActiveTab("recordings");
        } else if (data.topic?.Quiz?.length > 0 && activeTab === "resources" && data.topic.Resource.length === 0 && data.topic.Recording.length === 0) {
          setActiveTab("quiz");
        }
      } else if (res.status === 404) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch topic:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (field: keyof TopicProgress, value: boolean) => {
    const newProgress = { ...progress, [field]: value };
    setProgress(newProgress);
    try {
      await fetch(`/api/student/progress/${topicSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProgress),
      });
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
  };

  const startQuiz = async (quizId: string) => {
    setQuizLoading(true);
    try {
      const res = await fetch(`/api/student/quizzes/${quizId}/start`, { method: "POST" });
      const data = await res.json();
      if (data.attempt) {
        setAttemptId(data.attempt.id);
        router.push(`/quiz/${quizId}?attempt=${data.attempt.id}`);
      } else {
        alert(data.error || "Failed to start quiz");
      }
    } catch (error) {
      console.error("Failed to start quiz:", error);
    } finally {
      setQuizLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "LESSON": return "📘";
      case "NOTE": return "📝";
      case "WORKSHEET": return "📋";
      case "SAVE_MY_EXAM": return "💾";
      default: return "📄";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" aria-busy="true">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Topic not found</h1>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const { Unit, Resource, Recording, Quiz, Progress: topicProgress } = topic;
  const { Subject } = Unit;
  const allCompleted = progress.lessonViewed &&
    (Recording.length === 0 || progress.recordingWatched) &&
    (Quiz.length === 0 || progress.quizCompleted);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
          <ChevronLeft className="w-4 h-4" />
          <Link href={`/dashboard/${Subject.slug}`} className="hover:text-primary">{Subject.name}</Link>
          <ChevronLeft className="w-4 h-4" />
          <Link href={`/dashboard/${Subject.slug}/${Unit.slug}`} className="hover:text-primary">{Unit.name}</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white font-medium">{topic.name}</span>
        </nav>

        {/* Topic Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline">{Subject.name}</Badge>
            <Badge variant="outline">Unit {Unit.orderIndex}</Badge>
            <Badge variant="outline">Topic {topic.orderIndex}</Badge>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{topic.name}</h1>
        </div>

        {/* Progress Bar */}
        <GlassCard variant="default" padding="md" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Progress</h2>
            {allCompleted && (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Topic Complete!</span>
              </div>
            )}
          </div>
          <Progress
            value={[
              progress.lessonViewed ? 1 : 0,
              Recording.length === 0 ? 1 : (progress.recordingWatched ? 1 : 0),
              Quiz.length === 0 ? 1 : (progress.quizCompleted ? 1 : 0),
            ].filter(Boolean).length / 3 * 100}
            size="md"
            showLabel={true}
          />
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={progress.lessonViewed}
                onChange={(e) => updateProgress("lessonViewed", e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-gray-700 dark:text-gray-300">Lesson viewed</span>
            </label>
            {Recording.length > 0 && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={progress.recordingWatched}
                  onChange={(e) => updateProgress("recordingWatched", e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-gray-700 dark:text-gray-300">Recordings watched</span>
              </label>
            )}
            {Quiz.length > 0 && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={progress.quizCompleted}
                  onChange={(e) => updateProgress("quizCompleted", e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-gray-700 dark:text-gray-300">Quiz completed</span>
              </label>
            )}
          </div>
        </GlassCard>

        {/* Content Tabs */}
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            {(Resource.length > 0) && (
              <button
                onClick={() => setActiveTab("resources")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === "resources"
                    ? "bg-white dark:bg-gray-800 text-primary border-b-2 border-primary"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Resources ({Resource.length})
              </button>
            )}
            {(Recording.length > 0) && (
              <button
                onClick={() => setActiveTab("recordings")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === "recordings"
                    ? "bg-white dark:bg-gray-800 text-primary border-b-2 border-primary"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Recordings ({Recording.length})
              </button>
            )}
            {(Quiz.length > 0) && (
              <button
                onClick={() => setActiveTab("quiz")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === "quiz"
                    ? "bg-white dark:bg-gray-800 text-primary border-b-2 border-primary"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                Quiz ({Quiz.length})
              </button>
            )}
          </div>

          {/* Resources Tab */}
          {activeTab === "resources" && Resource.length > 0 && (
            <div className="space-y-4">
              {Resource.map((resource) => (
                <GlassCard key={resource.id} variant="default" padding="md" className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-2xl">
                    {getResourceIcon(resource.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">{resource.title}</h3>
                    {resource.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{resource.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                      <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                      <span>{formatFileSize(resource.fileSize)}</span>
                      <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(`/api/files/${encodeURIComponent(resource.fileKey)}`, "_blank")}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`/api/files/${encodeURIComponent(resource.fileKey)}?download=true`, "_blank")}>
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Recordings Tab */}
          {activeTab === "recordings" && Recording.length > 0 && (
            <div className="space-y-4">
              {Recording.map((recording) => (
                <GlassCard key={recording.id} variant="default" padding="md" className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-3xl">
                    <Play className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">{recording.title}</h3>
                    {recording.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{recording.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(recording.durationSeconds)}
                      </span>
                      {recording.recordedDate && (
                        <span>{new Date(recording.recordedDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => window.open(`https://stream.mux.com/${recording.streamVideoId}`, "_blank")}>
                    <Play className="w-4 h-4 mr-1" /> Watch
                  </Button>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Quiz Tab */}
          {activeTab === "quiz" && Quiz.length > 0 && (
            <div className="space-y-4">
              {Quiz.map((quiz) => {
                const attempt = quiz.QuizAttempt[0];
                const isCompleted = attempt?.submittedAt;
                return (
                  <GlassCard key={quiz.id} variant="default" padding="md" className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{quiz.title}</h3>
                        {isCompleted && (
                          <Badge variant="success">Completed</Badge>
                        )}
                        {!isCompleted && quiz.isActive && (
                          <Badge variant="outline">Available</Badge>
                        )}
                        {!quiz.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>{quiz._count?.select?.Question || 0} questions</span>
                        {quiz.timeLimitSeconds && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {Math.floor(quiz.timeLimitSeconds / 60)} min
                          </span>
                        )}
                        {attempt && (
                          <span>
                            {attempt.score !== null && attempt.maxScore !== null
                              ? `Score: ${attempt.score}/${attempt.maxScore}`
                              : `Attempted: ${new Date(attempt.startedAt).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => router.push(`/quiz/${quiz.id}/results?attemptId=${attempt.id}`)}>
                            <BarChart2 className="w-4 h-4 mr-1" /> View Results
                          </Button>
                          <Button variant="outline" size="sm" disabled>
                            <CheckCircle className="w-4 h-4 mr-1" /> Completed
                          </Button>
                        </>
                      ) : quiz.isActive ? (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={quizLoading}
                          onClick={() => startQuiz(quiz.id)}
                        >
                          <Play className="w-4 h-4 mr-1" /> Start Quiz
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Not Available
                        </Button>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}

          {/* Empty States */}
          {activeTab === "resources" && Resource.length === 0 && (
            <GlassCard variant="default" padding="xl" className="text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No resources yet</h3>
              <p className="text-gray-500 dark:text-gray-400">Your teacher hasn't added any resources for this topic.</p>
            </GlassCard>
          )}
          {activeTab === "recordings" && Recording.length === 0 && (
            <GlassCard variant="default" padding="xl" className="text-center">
              <Play className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No recordings yet</h3>
              <p className="text-gray-500 dark:text-gray-400">Your teacher hasn't added any recordings for this topic.</p>
            </GlassCard>
          )}
          {activeTab === "quiz" && Quiz.length === 0 && (
            <GlassCard variant="default" padding="xl" className="text-center">
              <Badge className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" style={{ fontSize: '48px' }}>❓</Badge>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No quizzes yet</h3>
              <p className="text-gray-500 dark:text-gray-400">Your teacher hasn't added any quizzes for this topic.</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}