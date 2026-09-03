import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Server-side route protection. Runs on the Edge runtime before any page
// renders, so unauthenticated or wrong-role users get a real redirect
// instead of the previous client-side "blank page" that only returned null.
//
// The JWT is self-contained (NextAuth JWT strategy), so we can read the
// role straight from the token without a database round-trip.

const ADMIN_PREFIX = "/admin";
const DASHBOARD_PREFIX = "/dashboard";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip non-page requests (API, static assets, images) for performance.
  // API routes enforce their own auth server-side.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes("/.") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAdminRoute = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
  const isDashboardRoute =
    pathname === DASHBOARD_PREFIX || pathname.startsWith(`${DASHBOARD_PREFIX}/`);

  // Public routes
  if (!isAdminRoute && !isDashboardRoute) {
    return NextResponse.next();
  }

  // Unauthenticated -> send to login
  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = isAdminRoute ? "/login/teacher" : "/login/student";
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated but wrong role -> bounce to the right area
  const role = token.role as string | undefined;
  if (isAdminRoute && role !== "TEACHER") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (isDashboardRoute && role === "TEACHER") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
