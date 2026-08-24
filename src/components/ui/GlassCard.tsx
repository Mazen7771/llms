"use client";

import { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  variant?: "default" | "strong" | "subtle";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  blur?: "none" | "sm" | "md" | "lg" | "xl";
  className?: string;
  style?: CSSProperties;
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-10",
};

const variantClasses = {
  default: "bg-white/10 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/50",
  strong: "bg-white/20 dark:bg-gray-800/80 border border-white/30 dark:border-gray-600/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)]",
  subtle: "bg-white/5 dark:bg-gray-900/30 border border-white/10 dark:border-gray-800/50",
};

const blurClasses = {
  none: "",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
};

export function GlassCard({ children, variant = "default", padding = "md", blur = "md", className = "" }: GlassCardProps) {
  return (
    <div
      className={`
        rounded-2xl ${variantClasses[variant]} ${paddingClasses[padding]} ${blurClasses[blur]} ${className}
      `}
    >
      {children}
    </div>
  );
}