"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useCallback } from "react";

export function useAuth(options?: { requiredRole?: "TEACHER" | "STUDENT" | "ADMIN"; redirectTo?: string }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const user = session?.user;
  const role = user?.role;

  const hasRole = useCallback(
    (requiredRole: "TEACHER" | "STUDENT" | "ADMIN") => {
      if (!role) return false;
      if (requiredRole === "ADMIN") return role === "TEACHER";
      return role === requiredRole;
    },
    [role]
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(options?.redirectTo || "/login");
    }
    if (
      !isLoading &&
      isAuthenticated &&
      options?.requiredRole &&
      !hasRole(options.requiredRole)
    ) {
      router.push("/unauthorized");
    }
  }, [isLoading, isAuthenticated, router, options, hasRole]);

  return {
    user,
    role,
    isLoading,
    isAuthenticated,
    hasRole,
    update,
  };
}

export function useUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}