"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LogOutIcon } from "lucide-react";

export function SignOutButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect based on user role - only after mount to avoid hydration mismatch
  const callbackUrl = mounted && session?.user?.role === "TEACHER" ? "/login/teacher" : "/login/student";

  return (
    <button
      onClick={() => signOut({ callbackUrl })}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
        className
      )}
      {...props}
    >
      <LogOutIcon className="h-4 w-4" />
      <span>Sign out</span>
    </button>
  );
}