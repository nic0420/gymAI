"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { soundEffects } from "@/lib/kiosk/sound-effects";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, description, duration = 4000 }: Omit<ToastMessage, "id">) => {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Feedback sonoro opcional
      if (type === "success") soundEffects.playAccessGranted();
      if (type === "error") soundEffects.playAccessDenied();
      if (type === "warning") soundEffects.playAccessWarning();

      setToasts((prev) => [...prev, { id, type, title, description, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string) => showToast({ type: "success", title, description }),
    [showToast]
  );
  const error = useCallback(
    (title: string, description?: string) => showToast({ type: "error", title, description }),
    [showToast]
  );
  const warning = useCallback(
    (title: string, description?: string) => showToast({ type: "warning", title, description }),
    [showToast]
  );
  const info = useCallback(
    (title: string, description?: string) => showToast({ type: "info", title, description }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast Render Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 ${
              t.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
                : t.type === "error"
                ? "bg-rose-950/90 border-rose-500/40 text-rose-100"
                : t.type === "warning"
                ? "bg-amber-950/90 border-amber-500/40 text-amber-100"
                : "bg-slate-900/90 border-slate-700 text-slate-100"
            }`}
          >
            <span className="text-xl">
              {t.type === "success" && "✅"}
              {t.type === "error" && "❌"}
              {t.type === "warning" && "⚠️"}
              {t.type === "info" && "ℹ️"}
            </span>
            <div className="flex-1">
              <h5 className="font-bold text-sm text-white">{t.title}</h5>
              {t.description && <p className="text-xs mt-0.5 opacity-90">{t.description}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-xs opacity-60 hover:opacity-100 p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe ser usado dentro de un ToastProvider");
  }
  return ctx;
}
