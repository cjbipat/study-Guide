"use client";

import { motion } from "framer-motion";

import type { Card, ReviewRating } from "@/lib/types";
import { previewInterval } from "@/lib/study/scheduler";
import { cn } from "@/lib/utils";

const CONFIG: {
  rating: ReviewRating;
  label: string;
  key: string;
  className: string;
}[] = [
  {
    rating: "again",
    label: "Again",
    key: "1",
    className:
      "border-accent/40 bg-accent/8 text-accent hover:bg-accent/16",
  },
  {
    rating: "hard",
    label: "Hard",
    key: "2",
    className:
      "border-warning/40 bg-warning/8 text-warning hover:bg-warning/16",
  },
  {
    rating: "good",
    label: "Good",
    key: "3",
    className:
      "border-success/50 bg-success/10 text-success-strong dark:text-success hover:bg-success/20 shadow-[0_6px_20px_-8px_var(--success)]",
  },
  {
    rating: "easy",
    label: "Easy",
    key: "4",
    className:
      "border-transparent bg-gradient-to-br from-emerald-500 to-teal-500 text-white hover:brightness-110 shadow-glow-success",
  },
];

export function ResponseButtons({
  card,
  disabled,
  onRate,
}: {
  card: Card;
  disabled?: boolean;
  onRate: (rating: ReviewRating) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {CONFIG.map((c, i) => (
        <motion.button
          key={c.rating}
          disabled={disabled}
          onClick={() => onRate(c.rating)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex flex-col items-center gap-1 rounded-2xl border px-3 py-3.5 text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50",
            c.className,
          )}
        >
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-bold dark:bg-white/15">
              {c.key}
            </kbd>
            {c.label}
          </span>
          <span className="text-[11px] font-semibold opacity-70">
            {previewInterval(card, c.rating)}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
