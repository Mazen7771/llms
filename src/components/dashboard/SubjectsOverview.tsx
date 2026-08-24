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

interface Topic {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  recordingsCount: number;
  hasQuiz: boolean;
  progress?: TopicProgress;
}

interface Unit {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
  topics: Topic[];
}

interface SubjectData {
  id: string;
  name: string;
  slug: string;
  units: Record<string, Unit>;
}

interface SubjectWithProgress {
  id: string;
  name: string;
  slug: string;
  icon: string;
  units: Array<{
    id: string;
    name: string;
    orderIndex: number;
    topics: Array<Topic & { isCompleted: boolean; progress: TopicProgress }>;
    totalTopics: number;
    completedTopics: number;
    progress: number;
  }>;
  totalTopics: number;
  completedTopics: number;
  overallProgress: number;
}

export function SubjectsOverview() {
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/topics')
      .then((res) => res.json())
      .then((data: SubjectData[]) => {
        const subjectsWithProgress = data.map((subject) => {
          const units = Object.values(subject.units);
          let totalTopics = 0;
          let completedTopics = 0;
          const unitsWithProgress = units.map((unit) => {
            const topicsWithProgress = unit.topics.map((topic) => {
              totalTopics++;
              const isCompleted = topic.progress?.lessonViewed &&
                (topic.recordingsCount === 0 || topic.progress?.recordingWatched) &&
                (!topic.hasQuiz || topic.progress?.quizCompleted);
              if (isCompleted) completedTopics++;
              return {
                ...topic,
                isCompleted: !!isCompleted,
                progress: topic.progress || {
                  lessonViewed: false,
                  recordingWatched: false,
                  quizCompleted: false
                }
              };
            });
            const unitCompleted = topicsWithProgress.filter((t) => t.isCompleted).length;
            return {
              ...unit,
              topics: topicsWithProgress.sort((a, b) => a.orderIndex - b.orderIndex),
              totalTopics: topicsWithProgress.length,
              completedTopics: unitCompleted,
              progress: topicsWithProgress.length > 0 ? Math.round(unitCompleted / topicsWithProgress.length * 100) : 0
            };
          });
          return {
            id: subject.id,
            name: subject.name,
            slug: subject.slug,
            icon: subject.slug === 'biology' ? '🧬' : '⚗️',
            units: unitsWithProgress.sort((a, b) => a.orderIndex - b.orderIndex),
            totalTopics,
            completedTopics,
            overallProgress: totalTopics > 0 ? Math.round(completedTopics / totalTopics * 100) : 0
          };
        });
        setSubjects(subjectsWithProgress);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                    {subject.totalTopics} topics across {Object.keys(subject.units).length} units
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
              {Object.values(subject.units).slice(0, 3).map((unit) => (
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
              {Object.keys(subject.units).length > 3 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  +{Object.keys(subject.units).length - 3} more units
                </p>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}