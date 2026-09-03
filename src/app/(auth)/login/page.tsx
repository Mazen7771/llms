"use client";

import { Suspense, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, GraduationCap, ArrowRight } from "lucide-react";

export default function LoginRedirectPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginRedirectContent />
    </Suspense>
  );
}

function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" aria-busy="true">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
    </div>
  );
}

function LoginRedirectContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    if (status === "authenticated") {
      // If already logged in, redirect based on role
      if (session?.user?.role === "TEACHER") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" aria-busy="true">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to LMS</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Biology & Chemistry Learning Platform</p>
        </div>

        <div className="space-y-4">
          <Link
            href={`/login/student?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="group flex items-center justify-center gap-3 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">Student Login</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Access your dashboard, quizzes, and progress</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
          </Link>

          <Link
            href={`/login/teacher?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="group flex items-center justify-center gap-3 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-secondary/50 hover:bg-secondary/5 dark:hover:bg-secondary/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-secondary-light flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-secondary transition-colors">Teacher Login</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage content, students, and analytics</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-secondary transition-colors" />
          </Link>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          Not sure where to go? Contact your administrator.
        </p>
      </div>
    </div>
  );
}