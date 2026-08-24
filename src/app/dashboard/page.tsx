"use client";

import { useSession } from "next-auth/react";
import { SubjectsOverview } from "@/components/dashboard/SubjectsOverview";

export default function DashboardPage() {
  const { data: session } = useSession();
  return (
    <div className="space-y-8">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:font-medium">
        Skip to main content
      </a>
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {session?.user?.name || 'Student'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Continue your learning journey in Biology & Chemistry</p>
      </header>
      <main id="dashboard-content">
        <SubjectsOverview />
      </main>
    </div>
  );
}