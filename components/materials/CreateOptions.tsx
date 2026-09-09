"use client";

import { motion } from "framer-motion";

import type { LearningItemType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const CREATE_OPTIONS: {
  type: LearningItemType;
  emoji: string;
  title: string;
  blurb: string;
  cta: string;
  accent: string;
  glow: string;
}[] = [
  {
    type: "flashcards",
    emoji: "🗂️",
    title: "Flashcards",
    blurb: "Turn important concepts into question-and-answer flashcards.",
    cta: "Create Flashcards",
    accent: "from-violet-500 to-fuchsia-500",
    glow: "group-hover:shadow-[0_16px_50px_-12px_rgba(139,92,246,0.5)]",
  },
  {
    type: "quiz",
    emoji: "✍️",
    title: "Practice Quiz",
    blurb: "Create questions to test your knowledge.",
    cta: "Create Quiz",
    accent: "from-blue-500 to-cyan-500",
    glow: "group-hover:shadow-[0_16px_50px_-12px_rgba(59,130,246,0.5)]",
  },
  {
    type: "study-guide",
    emoji: "📚",
    title: "Study Guide",
    blurb: "Organize important information into an easy-to-review study guide.",
    cta: "Create Study Guide",
    accent: "from-emerald-500 to-teal-500",
    glow: "group-hover:shadow-[0_16px_50px_-12px_rgba(16,185,129,0.5)]",
  },
  {
    type: "summary",
    emoji: "⚡",
    title: "Quick Review",
    blurb: "Create a condensed overview of the most important concepts.",
    cta: "Create Summary",
    accent: "from-amber-400 to-orange-500",
    glow: "group-hover:shadow-[0_16px_50px_-12px_rgba(245,158,11,0.5)]",
  },
];

export function CreateOptions({
  onSelect,
  disabled = false,
}: {
  onSelect: (type: LearningItemType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CREATE_OPTIONS.map((opt, i) => (
        <motion.button
          key={opt.type}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(opt.type)}
          initial={{ y: 16 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06 }}
          whileHover={disabled ? undefined : { y: -4, scale: 1.01 }}
          whileTap={disabled ? undefined : { scale: 0.99 }}
          className={cn(
            "group relative flex flex-col items-start overflow-hidden rounded-3xl border border-border bg-surface-solid p-6 text-left shadow-soft transition-shadow",
            disabled ? "opacity-50" : opt.glow,
          )}
        >
          <span
            className={cn(
              "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity group-hover:opacity-25",
              opt.accent,
            )}
          />
          <span className="text-4xl transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110">
            {opt.emoji}
          </span>
          <span className="mt-3 text-lg font-extrabold">{opt.title}</span>
          <span className="mt-1 text-sm leading-relaxed text-muted">
            {opt.blurb}
          </span>
          <span
            className={cn(
              "mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-4 py-2 text-sm font-bold text-white transition-transform group-hover:scale-105",
              opt.accent,
            )}
          >
            {opt.cta}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
