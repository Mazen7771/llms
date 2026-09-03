import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { nextUrl } = req;
  const isLoggedIn = !!token;
  const role = token?.role;
  const isStudent = role === "STUDENT";
  const isTeacher = role === "TEACHER";

  // Public paths that don't require authentication
  const publicPaths = ["/", "/login", "/login/student", "/login/teacher", "/api/auth", "/api/health"];

  // Check if the path is public
  const isPublicPath = publicPaths.some(path =>
    nextUrl.pathname === path || nextUrl.pathname.startsWith(path + "/")
  );

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Dashboard routes - require STUDENT role
  if (nextUrl.pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
      return NextResponse.redirect(new URL(`/login/student?callbackUrl=${callbackUrl}`, nextUrl));
    }
    if (!isStudent) {
      // Teacher trying to access student dashboard - redirect to admin
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
    return NextResponse.next();
  }

  // Admin routes - require TEACHER role
  if (nextUrl.pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
      return NextResponse.redirect(new URL(`/login/teacher?callbackUrl=${callbackUrl}`, nextUrl));
    }
    if (!isTeacher) {
      // Student trying to access admin - redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // Quiz routes - require STUDENT role
  if (nextUrl.pathname.startsWith("/quiz")) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
      return NextResponse.redirect(new URL(`/login/student?callbackUrl=${callbackUrl}`, nextUrl));
    }
    if (!isStudent) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // API routes protection
  if (nextUrl.pathname.startsWith("/api/student")) {
    if (!isLoggedIn || !isStudent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (nextUrl.pathname.startsWith("/api/admin")) {
    if (!isLoggedIn || !isTeacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Default: allow if logged in, redirect to login if not
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(new URL(`/login/student?callbackUrl=${callbackUrl}`, nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};