"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "outlined" | "elevated" | "interactive";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-10",
};

const variantClasses = {
  outlined: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
  elevated:
    "bg-white dark:bg-gray-800 border border-transparent shadow-[var(--shadow-md)] dark:shadow-none dark:border-gray-700/60",
  interactive:
    "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 dark:hover:border-primary/50 cursor-pointer",
};

export function Card({ children, variant = "outlined", padding = "md", className = "" }: CardProps) {
  return <div className={`rounded-2xl ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>{children}</div>;
}