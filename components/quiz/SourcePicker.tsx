"use client";

import { motion } from "framer-motion";

import type { QuizSourceType } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

const SOURCES: {
  type: QuizSourceType;
  emoji: string;
  title: string;
  blurb: string;
  accent: string;
}[] = [
  {
    type: "material",
    emoji: "📄",
    title: "Study Material",
    blurb: "Create a quiz from uploaded material.",
    accent: "from-blue-500 to-cyan-500",
  },
  {
    type: "deck",
    emoji: "🗂",
    title: "Flashcard Deck",
    blurb: "Turn flashcards into a quiz.",
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    type: "language",
    emoji: "🌍",
    title: "Language",
    blurb: "Create a quiz from vocabulary, units, or conversations.",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    type: "manual",
    emoji: "✍️",
    title: "Create Manually",
    blurb: "Write your own questions.",
    accent: "from-amber-400 to-orange-500",
  },
];

export function SourcePicker({
  onPick,
}: {
  onPick: (type: QuizSourceType) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-extrabold tracking-tight">
        What do you want to create a quiz from?
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {SOURCES.map((s, i) => (
          <motion.button
            key={s.type}
            type="button"
            onClick={() => onPick(s.type)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4 }}
            className="group relative flex flex-col items-start overflow-hidden rounded-3xl border border-border bg-surface-solid p-6 text-left shadow-soft transition-shadow hover:shadow-glow"
          >
            <span
              className={cn(
                "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity group-hover:opacity-25",
                s.accent,
              )}
            />
            <span className="text-4xl transition-transform group-hover:scale-110">
              {s.emoji}
            </span>
            <span className="mt-3 text-lg font-extrabold">{s.title}</span>
            <span className="mt-1 text-sm text-muted">{s.blurb}</span>
            <span
              className={cn(
                "mt-4 inline-flex rounded-full bg-gradient-to-r px-4 py-1.5 text-sm font-bold text-white",
                s.accent,
              )}
            >
              Choose
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
