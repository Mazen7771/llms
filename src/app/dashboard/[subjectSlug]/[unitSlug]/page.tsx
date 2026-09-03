"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, BookOpen, CheckCircle, Clock, Play, FileText } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";

interface Topic {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  recordingsCount: number;
  hasQuiz: boolean;
  progress?: {
    lessonViewed: boolean;
    recordingWatched: boolean;
    quizCompleted: boolean;
  };
}

interface UnitData {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  Subject: {
    id: string;
    name: string;
    slug: string;
  };
  topics: Topic[];
}

export default function UnitPage() {
  const params = useParams();
  const router = useRouter();
  const { subjectSlug, unitSlug } = params;

  const [unit, setUnit] = useState<UnitData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnit();
  }, [subjectSlug, unitSlug]);

  const fetchUnit = async () => {
    try {
      const res = await fetch(`/api/student/dashboard`);
      if (res.ok) {
        const data = await res.json();
        const subject = data.subjects.find((s: any) => s.slug === subjectSlug);
        if (subject) {
          const unitData = Object.values(subject.units).find((u: any) => u.slug === unitSlug);
          if (unitData) {
            setUnit(unitData as UnitData);
          } else {
            router.push(`/dashboard/${subjectSlug}`);
          }
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch unit:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getTopicProgress = (topic: Topic) => {
    const p = topic.progress || { lessonViewed: false, recordingWatched: false, quizCompleted: false };
    let completed = 0;
    let total = 0;
    if (p.lessonViewed) completed++;
    total++;
    if (topic.recordingsCount > 0) {
      if (p.recordingWatched) completed++;
      total++;
    }
    if (topic.hasQuiz) {
      if (p.quizCompleted) completed++;
      total++;
    }
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const isTopicCompleted = (topic: Topic) => {
    const p = topic.progress || { lessonViewed: false, recordingWatched: false, quizCompleted: false };
    return p.lessonViewed &&
      (topic.recordingsCount === 0 || p.recordingWatched) &&
      (!topic.hasQuiz || p.quizCompleted);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" aria-busy="true">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
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

  if (!unit) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Unit not found</h1>
          <Link href={`/dashboard/${subjectSlug}`} className="mt-4 text-primary hover:underline">Back to Subject</Link>
        </div>
      </div>
    );
  }

  const { Subject, topics } = unit;
  const totalTopics = topics.length;
  const completedTopics = topics.filter(isTopicCompleted).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
          <ChevronLeft className="w-4 h-4" />
          <Link href={`/dashboard/${Subject.slug}`} className="hover:text-primary">{Subject.name}</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white font-medium">{unit.name}</span>
        </nav>

        {/* Unit Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline">{Subject.name}</Badge>
            <Badge variant="outline">Unit {unit.orderIndex}</Badge>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{unit.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{totalTopics} topics · {completedTopics} completed</p>
        </div>

        {/* Overall Progress */}
        <GlassCard variant="default" padding="md" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Unit Progress</h2>
            {completedTopics === totalTopics && totalTopics > 0 && (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Unit Complete!</span>
              </div>
            )}
          </div>
          <Progress value={totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0} size="md" showLabel={true} />
        </GlassCard>

        {/* Topics List */}
        <div className="space-y-4">
          {topics.sort((a, b) => a.orderIndex - b.orderIndex).map((topic) => {
            const progress = getTopicProgress(topic);
            const completed = isTopicCompleted(topic);

            return (
              <Link
                key={topic.id}
                href={`/dashboard/${Subject.slug}/${unit.slug}/${topic.id}`}
                className="group"
              >
                <GlassCard variant="strong" padding="md" className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 group-hover:bg-primary/10 dark:group-hover:bg-primary/20 transition-colors">
                    {completed ? (
                      <CheckCircle className="w-6 h-6 text-success" />
                    ) : topic.recordingsCount > 0 ? (
                      <Play className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                      {topic.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {topic.recordingsCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Play className="w-3.5 h-3.5" />
                          {topic.recordingsCount} recording{topic.recordingsCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {topic.hasQuiz && (
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">Quiz</Badge>
                        </span>
                      )}
                    </div>
                    <Progress value={progress} size="sm" showLabel={false} className="mt-2 w-48" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{progress}%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {completed ? "Complete" : "In Progress"}
                    </div>
                  </div>
                </GlassCard>
              </Link>
            );
          })}

          {topics.length === 0 && (
            <GlassCard variant="default" padding="xl" className="text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No topics yet</h3>
              <p className="text-gray-500 dark:text-gray-400">Your teacher hasn't added any topics to this unit.</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}