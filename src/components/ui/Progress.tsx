"use client";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export const Progress = ({ className, value = 0, max = 100, size = "md", showLabel = false, ...props }: ProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        `relative w-full overflow-hidden rounded-full bg-secondary ${sizeClasses[size]}`,
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
      {showLabel && (
        <span className="absolute right-0 top-0 text-xs text-gray-500 dark:text-gray-400 -mt-5">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};