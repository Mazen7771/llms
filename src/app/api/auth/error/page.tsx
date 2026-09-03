"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<Redirecting />}>
      <AuthErrorContent />
    </Suspense>
  );
}

function Redirecting() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" aria-busy="true">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
      <p className="sr-only">Redirecting to appropriate login page...</p>
    </div>
  );
}

function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get the error type from query params
    const error = searchParams.get("error");
    const callbackUrl = searchParams.get("callbackUrl");

    // If there's a callbackUrl, check if it's an admin route
    if (callbackUrl) {
      const decodedCallback = decodeURIComponent(callbackUrl);
      if (decodedCallback.startsWith("/admin")) {
        router.push(`/login/teacher?callbackUrl=${callbackUrl}`);
        return;
      }
    }

    // Check error type for teacher-specific errors
    if (error === "CredentialsSignin" || error === "AccessDenied") {
      // Could be teacher trying to access admin
      if (callbackUrl && decodeURIComponent(callbackUrl).startsWith("/admin")) {
        router.push(`/login/teacher?callbackUrl=${callbackUrl}`);
        return;
      }
    }

    // Default redirect to student login
    const redirectUrl = callbackUrl ? `/login/student?callbackUrl=${callbackUrl}` : "/login/student";
    router.push(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" aria-busy="true">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
      <p className="sr-only">Redirecting to appropriate login page...</p>
    </div>
  );
}