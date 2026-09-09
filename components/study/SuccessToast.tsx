"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Flame, Sparkles } from "lucide-react";

export interface ToastData {
  id: number;
  title: string;
  xp: number;
  streak?: number;
}

export function SuccessToast({ toast }: { toast: ToastData | null }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-24 z-[80] flex justify-center px-4"
      aria-live="polite"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="flex items-center gap-3 rounded-2xl border border-success/30 bg-surface-solid px-5 py-3 shadow-glow-success"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-success/15 text-success-strong dark:text-success">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold">{toast.title}</p>
              <p className="flex items-center gap-2 text-xs font-semibold text-muted">
                <span className="text-success-strong dark:text-success">
                  +{toast.xp} XP
                </span>
                {toast.streak != null && (
                  <span className="flex items-center gap-1 text-accent">
                    <Flame className="h-3 w-3" /> {toast.streak} day streak
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
