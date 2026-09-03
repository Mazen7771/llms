"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

interface TopicProgress {
  lessonViewed: boolean;
  recordingWatched: boolean;
  quizCompleted: boolean;
}

// Shape returned by /api/student/dashboard for each topic.
interface DashboardTopic {
  id: string;
  name: string;
  orderIndex: number;
  recordingsCount: number;
  hasQuiz: boolean;
  progress?: TopicProgress;
}

// Shape returned by /api/student/dashboard for each unit (units is an object
// keyed by unit id, so the client iterates Object.values()).
interface DashboardUnit {
  id: string;
  name: string;
  orderIndex: number;
  topics: DashboardTopic[];
}

interface RawSubject {
  id: string;
  name: string;
  slug: string;
  units: Record<string, DashboardUnit>;
}

interface Unit extends DashboardUnit {
  totalTopics: number;
  completedTopics: number;
  progress: number;
}

interface SubjectWithProgress {
  id: string;
  name: string;
  slug: string;
  icon: string;
  units: Unit[];
  totalTopics: number;
  completedTopics: number;
  overallProgress: number;
}

const isTopicCompleted = (topic: DashboardTopic) => {
  const p = topic.progress;
  return (
    !!p?.lessonViewed &&
    (topic.recordingsCount === 0 || !!p?.recordingWatched) &&
    (!topic.hasQuiz || !!p?.quizCompleted)
  );
};

export function SubjectsOverview() {
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/student/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data: { subjects?: RawSubject[] }) => {
        const rawSubjects = data.subjects ?? [];
        const subjectsWithProgress = rawSubjects.map((subject) => {
          let totalTopics = 0;
          let completedTopics = 0;

          const units: Unit[] = Object.values(subject.units ?? {}).map((unit) => {
            const topicsWithProgress = (unit.topics ?? []).map((topic) => {
              totalTopics++;
              if (isTopicCompleted(topic)) completedTopics++;
              return topic;
            });

            const unitCompleted = topicsWithProgress.filter(isTopicCompleted).length;

            return {
              ...unit,
              topics: topicsWithProgress.sort((a, b) => a.orderIndex - b.orderIndex),
              totalTopics: topicsWithProgress.length,
              completedTopics: unitCompleted,
              progress:
                topicsWithProgress.length > 0
                  ? Math.round((unitCompleted / topicsWithProgress.length) * 100)
                  : 0,
            };
          });

          return {
            id: subject.id,
            name: subject.name,
            slug: subject.slug,
            icon: subject.slug === "biology" ? "🧬" : "⚗️",
            units: units.sort((a, b) => a.orderIndex - b.orderIndex),
            totalTopics,
            completedTopics,
            overallProgress: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
          };
        });

        if (mounted) {
          setSubjects(subjectsWithProgress);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Failed to load your subjects. Please try again.");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {[1, 2].map((i) => (
          <Card key={i} variant="elevated" padding="lg" className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4" aria-hidden="true">📚</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No content yet</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Your teacher hasn't added any topics yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {subjects.map((subject) => (
        <Link key={subject.id} href={`/dashboard/${subject.slug}`} className="group">
          <Card variant="interactive" padding="lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{subject.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{subject.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {subject.totalTopics} topics across {subject.units.length} units
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary dark:text-primary-light tabular-nums">
                  {subject.overallProgress}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Complete</div>
              </div>
            </div>
            <Progress value={subject.overallProgress} size="md" showLabel={false} className="mb-4" />
            <div className="space-y-2">
              {subject.units.slice(0, 3).map((unit) => (
                <div key={unit.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate pr-2">{unit.name}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={unit.progress} max={100} size="sm" showLabel={false} className="w-24" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right tabular-nums">
                      {unit.completedTopics}/{unit.totalTopics}
                    </span>
                  </div>
                </div>
              ))}
              {subject.units.length > 3 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  +{subject.units.length - 3} more units
                </p>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
