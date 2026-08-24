"use client";

import { ReactNode, ButtonHTMLAttributes, forwardRef } from "react";

export interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  fullWidth?: boolean;
  loading?: boolean;
  shimmer?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      shimmer = false,
      icon,
      iconPosition = "left",
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary-dark focus-visible:ring-primary",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-dark focus-visible:ring-secondary",
      accent: "bg-accent text-accent-foreground hover:bg-accent-dark focus-visible:ring-accent",
      outline: "border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-gray-400",
      ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-gray-400",
      danger: "bg-error text-white hover:bg-error-dark focus-visible:ring-error",
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-4 py-2 text-base gap-2",
      lg: "px-6 py-3 text-lg gap-2.5",
      icon: "p-2",
    };

    const baseClasses = `
      inline-flex items-center justify-center font-semibold rounded-xl
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-[0.98]
      ${fullWidth ? "w-full" : ""}
      ${shimmer && !loading ? "relative overflow-hidden" : ""}
    `;

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
            <span className="relative z-10">{children}</span>
            {icon && iconPosition === "right" && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
          </>
        )}
        {shimmer && !loading && (
          <span
            className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
            aria-hidden="true"
          />
        )}
      </button>
    );
  }
);

PremiumButton.displayName = "PremiumButton";