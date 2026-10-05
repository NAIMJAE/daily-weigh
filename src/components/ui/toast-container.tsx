"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

export interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  code?: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === "error";
        const isSuccess = toast.type === "success";
        const isWarning = toast.type === "warning";

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto w-full p-3.5 rounded-[10px] shadow-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-200 flex items-start gap-3 ${
              isError
                ? "bg-[#1C1010] text-[#FFECEC] border-red-500/60 shadow-red-950/40"
                : isWarning
                ? "bg-[#1E1910] text-[#FFF6E5] border-amber-500/60 shadow-amber-950/40"
                : isSuccess
                ? "bg-[#0E1A13] text-[#E8F8EE] border-emerald-500/60 shadow-emerald-950/40"
                : "bg-[#111111] text-white border-zinc-700 shadow-black/50"
            }`}
          >
            {/* 아이콘 */}
            <div className="shrink-0 mt-0.5">
              {isError && <AlertCircle className="w-5 h-5 text-red-400" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {!isError && !isWarning && !isSuccess && (
                <Info className="w-5 h-5 text-[#FF4D00]" />
              )}
            </div>

            {/* 본문 메시지 & 에러 코드 */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-xs font-semibold leading-snug break-words">
                {toast.message}
              </div>

              {toast.code && (
                <div className="text-[13px] font-mono bg-black/50 px-2 py-1 rounded text-red-300 border border-red-500/30 break-all select-all">
                  <code>{toast.code}</code>
                </div>
              )}
            </div>

            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
