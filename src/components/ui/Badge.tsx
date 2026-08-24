"use client";

import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
}

export const Badge = ({ className, variant = "default", size = "md", ...props }: BadgeProps) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        sizeClasses[size],
        {
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80":
            variant === "default",
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80":
            variant === "secondary",
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80":
            variant === "destructive",
          "text-foreground":
            variant === "outline",
          "border-transparent bg-green-500 text-white hover:bg-green-500/80":
            variant === "success",
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80":
            variant === "warning",
          "border-transparent bg-red-500 text-white hover:bg-red-500/80":
            variant === "error",
        },
        className
      )}
      {...props}
    />
  );
};