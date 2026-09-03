"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, BookOpen, CheckCircle, CheckCircle2, Clock } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";

interface Unit {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  topics: Array<{
    id: string;
    progress?: {
      lessonViewed: boolean;
      recordingWatched: boolean;
      quizCompleted: boolean;
    };
    recordingsCount: number;
    hasQuiz: boolean;
  }>;
  totalTopics: number;
  completedTopics: number;
  progress: number;
}

interface SubjectData {
  id: string;
  name: string;
  slug: string;
  icon: string;
  units: Record<string, Unit>;
  totalTopics: number;
  completedTopics: number;
  overallProgress: number;
}

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const { subjectSlug } = params;

  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubject();
  }, [subjectSlug]);

  const fetchSubject = async () => {
    try {
      const res = await fetch(`/api/student/dashboard`);
      if (res.ok) {
        const data = await res.json();
        const subjectData = data.subjects.find((s: any) => s.slug === subjectSlug);
        if (subjectData) {
          setSubject({
            id: subjectData.id,
            name: subjectData.name,
            slug: subjectData.slug,
            icon: subjectData.icon,
            units: subjectData.units,
            totalTopics: subjectData.totalTopics,
            completedTopics: subjectData.completedTopics,
            overallProgress: subjectData.overallProgress,
          });
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch subject:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getUnitProgress = (unit: Unit) => {
    let completed = 0;
    let total = 0;
    Object.values(unit.topics).forEach((topic) => {
      const p = topic.progress || { lessonViewed: false, recordingWatched: false, quizCompleted: false };
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
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const isUnitCompleted = (unit: Unit) => {
    return Object.values(unit.topics).every((topic) => {
      const p = topic.progress || { lessonViewed: false, recordingWatched: false, quizCompleted: false };
      return p.lessonViewed &&
        (topic.recordingsCount === 0 || p.recordingWatched) &&
        (!topic.hasQuiz || p.quizCompleted);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" aria-busy="true">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subject not found</h1>
          <Link href="/dashboard" className="mt-4 text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const units = Object.values(subject.units).sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white font-medium">{subject.name}</span>
        </nav>

        {/* Subject Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{subject.icon}</span>
            <Badge variant="outline">{subject.name}</Badge>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{subject.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {units.length} units · {subject.totalTopics} topics · {subject.completedTopics} completed
          </p>
        </div>

        {/* Overall Progress */}
        <GlassCard variant="default" padding="md" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Progress</h2>
            {subject.completedTopics === subject.totalTopics && subject.totalTopics > 0 && (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Subject Complete!</span>
              </div>
            )}
          </div>
          <Progress value={subject.overallProgress} size="md" showLabel={true} />
        </GlassCard>

        {/* Units Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => {
            const progress = unit.progress; // This comes from the API
            const completed = isUnitCompleted(unit);

            return (
              <Link
                key={unit.id}
                href={`/dashboard/${subject.slug}/${unit.slug}`}
                className="group"
              >
                <GlassCard variant="strong" padding="lg" className="h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                          {unit.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Unit {unit.orderIndex}</p>
                      </div>
                    </div>
                    {completed && (
                      <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <span>{unit.totalTopics} topics</span>
                      <span>·</span>
                      <span>{unit.completedTopics} completed</span>
                    </div>
                    <Progress value={progress} size="md" showLabel={true} className="mt-auto" />
                  </div>
                </GlassCard>
              </Link>
            );
          })}

          {units.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3">
              <GlassCard variant="default" padding="xl" className="text-center">
                <BookOpen className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No units yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Your teacher hasn't added any units to this subject.</p>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}