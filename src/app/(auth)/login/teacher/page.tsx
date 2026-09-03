"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { getCsrfToken } from "next-auth/react";
import Link from "next/link";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { PremiumInput } from "@/components/ui/PremiumInput";
import { GlassCard } from "@/components/ui/GlassCard";
import { LoginBackground } from "@/components/ui/LoginBackground";
import { Alert } from "@/components/ui/Alert";

const BookIcon = ({ className = "" }) => (
  <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const UserIcon = ({ className = "" }) => (
  <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ShieldIcon = ({ className = "" }) => (
  <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const MailIcon = ({ className = "" }) => (
  <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = ({ className = "" }) => (
  <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const ArrowRightIcon = ({ className = "" }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const EyeIcon = ({ className = "" }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = ({ className = "" }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

function TeacherLoginPageContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const urlError = searchParams.get("error");

  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!studentId.trim()) {
      setError("Teacher ID is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);

    // Use a native form POST to the NextAuth callback instead of signIn().
    // NextAuth's signIn() helper does a JS fetch to the callback, which can hang
    // in this Next.js 16 / NextAuth v4 setup and leave the button spinning
    // forever. A native submission lets the browser handle the request and the
    // 302 redirect itself, so the session cookie is set and navigation always
    // completes. Failed credentials redirect to this page with ?error=..., which
    // is rendered from `urlError` above.
    try {
      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        setError("Could not start sign-in. Please try again.");
        setIsLoading(false);
        return;
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/callback/teacher";
      const add = (name: string, value: string) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };
      add("csrfToken", csrfToken);
      add("studentId", studentId.trim());
      add("password", password);
      add("callbackUrl", callbackUrl);
      document.body.appendChild(form);
      form.submit();
      // The browser navigates away; isLoading intentionally stays true.
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a2b28] to-slate-950">
      <a href="#login-form" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:font-medium">
        Skip to login form
      </a>
      <LoginBackground variant="teacher" />
      <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-secondary/10 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/10 blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-secondary/5 blur-3xl" />
      </div>
      <main id="login-form" className="w-full max-w-md relative z-10">
        <header className="text-center mb-10 animate-fade-in-up">
          <Link href="/" aria-label="Go to homepage">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-[0_8px_24px_rgba(27,75,102,0.4)]">
                <BookIcon className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">LMS</span>
            </div>
          </Link>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-secondary/20 to-primary/10 border border-secondary/30 mb-6 animate-float">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center border-2 border-white dark:border-gray-900">
                <ShieldIcon className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Teacher Sign In</h1>
          <p className="text-white/70 text-lg">Access the admin dashboard</p>
        </header>
        <GlassCard variant="strong" padding="lg" blur="xl" className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          {(urlError || error) && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 animate-slide-in" role="alert" aria-live="assertive">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-sm font-medium">{error || "Invalid credentials. Please try again."}</p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <PremiumInput
              id="studentId"
              label="Teacher ID"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              autoComplete="username"
              placeholder="Enter your Teacher ID"
              icon={<UserIcon />}
              iconPosition="left"
            />
            <div className="relative">
              <PremiumInput
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                icon={<LockIcon />}
                iconPosition="left"
              />
              <button
                type="button"
                className="absolute right-4 top-[38px] text-white/50 hover:text-white/80 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-expanded={showPassword}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <PremiumButton
              type="submit"
              fullWidth
              loading={isLoading}
              size="lg"
              variant="primary"
              shimmer={!isLoading}
              className="mt-2"
            >
              <span className="flex items-center justify-center gap-2">
                Sign In
                <ArrowRightIcon />
              </span>
            </PremiumButton>
          </form>
          <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: "200ms" }}>
            <Link href="/login/student">
              <span className="text-sm text-white/60 hover:text-white/90 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded">
                Student? Sign in here
              </span>
            </Link>
          </div>
          <div className="mt-8 p-5 rounded-2xl bg-white/5 border border-white/10 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center" aria-hidden="true">
                <ShieldIcon className="w-5 h-5 text-secondary-light" />
              </div>
              <p className="font-semibold text-white">Teacher Access</p>
            </div>
            <div className="space-y-3 text-sm text-white/70">
              <p>
                <strong className="text-white">Teacher ID:</strong> 0 (pre-configured)
              </p>
              <p>
                <strong className="text-white">Password:</strong> Set via environment variable <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">TEACHER_PASSWORD</code>
              </p>
              <p className="text-secondary-light font-medium">Contact the system administrator if you need access.</p>
            </div>
          </div>
        </GlassCard>
        <footer className="mt-8 text-center animate-fade-in" style={{ animationDelay: "400ms" }}>
          <p className="text-white/40 text-sm">
            Part of the <strong className="text-white/60">Learning Management System</strong>
          </p>
        </footer>
      </main>
    </div>
  );
}

export default function TeacherLoginPageSuspense() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10" />
            <div className="w-48 h-6 rounded-xl bg-white/10" />
            <div className="w-64 h-64 rounded-2xl bg-white/10" />
          </div>
        </div>
      }
    >
      <TeacherLoginPageContent />
    </Suspense>
  );
}