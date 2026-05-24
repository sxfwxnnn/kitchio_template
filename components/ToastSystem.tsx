"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  sticky?: boolean; // stays visible until manually dismissed
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, options?: { duration?: number; sticky?: boolean }) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToastSystem() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastSystem must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType, options?: { duration?: number; sticky?: boolean }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const duration = options?.duration ?? 4000;
      const sticky = options?.sticky ?? false;

      setToasts((prev) => {
        // If sticky is requested for a specific postcode success message, let's remove existing similar stickies first
        if (sticky) {
          return [...prev.filter((t) => !t.sticky), { id, type, message, duration, sticky }];
        }
        return [...prev, { id, type, message, duration, sticky }];
      });

      if (!sticky) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      clearAllToasts,
    }),
    [toasts, showToast, dismissToast, clearAllToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-2.5 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const styles = useMemo(() => {
    switch (toast.type) {
      case "success":
        return {
          bg: "bg-emerald-50 border-emerald-250 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-350",
          icon: <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />,
        };
      case "error":
        return {
          bg: "bg-rose-50 border-rose-250 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-350",
          icon: <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />,
        };
      case "warning":
        return {
          bg: "bg-amber-50 border-amber-250 text-amber-800 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-350",
          icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
        };
      case "info":
      default:
        return {
          bg: "bg-zinc-50 border-zinc-250 text-zinc-800 dark:bg-zinc-900/95 dark:border-zinc-800 dark:text-zinc-350",
          icon: <Info className="h-4 w-4 text-zinc-500 shrink-0" />,
        };
    }
  }, [toast.type]);

  return (
    <div
      className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-sm transition-all duration-300 animate-slide-down ${styles.bg}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5">{styles.icon}</span>
        <p className="text-xs font-semibold leading-relaxed tracking-tight">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
        aria-label="Dismiss toast"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Inline styles for animate-slide-down if not defined in Tailwind
// Wait, we will inject a small custom animation class in globals.css or keep it standard.
