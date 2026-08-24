"use client";

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = useCallback(({ title, description, variant = "default", duration = 5000 }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, title, description, variant, duration };

    setState((prev) => ({ toasts: [...prev.toasts, newToast] }));

    setTimeout(() => {
      setState((prev) => ({ toasts: prev.toasts.filter((t) => t.id !== id) }));
    }, duration);

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setState((prev) => ({ toasts: prev.toasts.filter((t) => t.id !== id) }));
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  };
}