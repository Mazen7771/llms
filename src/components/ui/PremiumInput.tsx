"use client";

import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

export interface PremiumInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  error?: string;
  helperText?: string;
}

export const PremiumInput = forwardRef<HTMLInputElement, PremiumInputProps>(
  (
    {
      label,
      icon,
      iconPosition = "left",
      error,
      helperText,
      className = "",
      id,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const describedBy = [error && errorId, helperText && helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        <label htmlFor={inputId} className="label block mb-1.5">
          {label}
          {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
        </label>
        <div className="relative">
          {icon && iconPosition === "left" && (
            <div
              className="absolute left-3 top-[38px] text-gray-400 dark:text-gray-500 pointer-events-none flex items-center"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full
              pl-${icon && iconPosition === "left" ? "10" : "4"}
              pr-${icon && iconPosition === "right" ? "10" : "4"}
              py-3
              rounded-xl
              bg-white dark:bg-gray-800
              border-2
              ${error ? "border-error" : "border-gray-200 dark:border-gray-700"}
              focus:border-primary dark:focus:border-primary-light
              focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/20
              text-gray-900 dark:text-white
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            disabled={disabled}
            required={required}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={describedBy}
            {...props}
          />
          {icon && iconPosition === "right" && (
            <div
              className="absolute right-3 top-[38px] text-gray-400 dark:text-gray-500 pointer-events-none flex items-center"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-error flex items-center gap-1" role="alert">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

PremiumInput.displayName = "PremiumInput";