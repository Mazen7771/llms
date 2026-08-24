"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const StatCard = ({
  label,
  value,
  icon,
  color,
  href,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  href?: string;
}) => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary/10 dark:bg-primary/20", text: "text-primary dark:text-primary-light" },
    secondary: { bg: "bg-secondary/10 dark:bg-secondary/20", text: "text-secondary dark:text-secondary-light" },
    accent: { bg: "bg-accent/10 dark:bg-accent/20", text: "text-accent-foreground dark:text-accent-light" },
    success: { bg: "bg-success/10 dark:bg-success/20", text: "text-success dark:text-success-light" },
    purple: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400" },
    indigo: { bg: "bg-indigo-500/10 dark:bg-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400" },
    pink: { bg: "bg-pink-500/10 dark:bg-pink-500/20", text: "text-pink-600 dark:text-pink-400" },
    warning: { bg: "bg-warning/10 dark:bg-warning/20", text: "text-warning dark:text-warning-light" },
  };

  const colors = colorMap[color] || colorMap.primary;

  const content = (
    <Card variant="elevated" padding="lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`} aria-hidden="true">
          <span className={`text-xl ${colors.text}`}>{icon}</span>
        </div>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
};

const stats = [
  { key: "students", label: "Students", icon: "👥", color: "primary" },
  { key: "subjects", label: "Subjects", icon: "📚", color: "secondary" },
  { key: "units", label: "Units", icon: "📁", color: "accent" },
  { key: "topics", label: "Topics", icon: "📝", color: "success" },
  { key: "resources", label: "Resources", icon: "📄", color: "purple" },
  { key: "recordings", label: "Recordings", icon: "🎥", color: "indigo" },
  { key: "quizzes", label: "Quizzes", icon: "❓", color: "pink" },
  { key: "pendingInvites", label: "Pending Invites", icon: "📨", color: "warning" },
];

const quickActions = [
  {
    href: "/dashboard",
    icon: "➕",
    title: "Add Content",
    description: "Content management coming soon — browse the current catalog",
    bg: "bg-primary/10 dark:bg-primary/20",
    ring: "focus-visible:ring-primary",
  },
  {
    href: "/admin/students",
    icon: "👥",
    title: "Manage Students",
    description: "Invite new students, view progress, manage access",
    bg: "bg-success/10 dark:bg-success/20",
    ring: "focus-visible:ring-success",
  },
  {
    href: "/dashboard/search",
    icon: "❓",
    title: "Browse Quizzes",
    description: "Quiz builder coming soon — search existing content",
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    ring: "focus-visible:ring-purple-500",
  },
];

const quickLinks = [
  {
    href: "/dashboard/search?type=resource",
    icon: "📚",
    title: "Content Library",
    desc: "Search subjects, units, and topics",
  },
  {
    href: "/admin/students",
    icon: "📈",
    title: "Student Progress",
    desc: "View per-student activity & attempts",
  },
  {
    href: "/admin/settings?tab=notifications",
    icon: "📢",
    title: "Announcements",
    desc: "Configure notification settings",
  },
  {
    href: "/admin/settings",
    icon: "⚙️",
    title: "Settings",
    desc: "Platform configuration",
  },
];

function AdminPageContent() {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((json) => {
        if (mounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Loading statistics">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Platform statistics and quick actions</p>
        </header>
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">Statistics</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.key} variant="elevated" padding="lg" className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </Card>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <a href="#admin-overview" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-secondary focus:text-white focus:rounded-lg focus:font-medium">
        Skip to admin overview
      </a>
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Overview</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Platform statistics and quick actions</p>
      </header>
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Statistics</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.key}
              label={stat.label}
              value={data?.[stat.key] ?? 0}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </div>
      </section>
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="sr-only">Quick Actions</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-xl"
            >
              <Card variant="interactive" padding="lg">
                <div
                  className={`w-12 h-12 rounded-xl ${action.bg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}
                  aria-hidden="true"
                >
                  <span className="text-2xl">{action.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{action.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{action.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      <section aria-labelledby="quick-links-heading">
        <h2 id="quick-links-heading" className="sr-only">Quick Links</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-xl"
            >
              <Card variant="interactive" padding="lg">
                <p className="font-medium text-gray-900 dark:text-white">{link.icon} {link.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{link.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminPageSuspense() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" aria-busy="true">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}