"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Layers,
  Repeat,
} from "lucide-react";

import type { MaterialProgress } from "@/lib/types";

export function LearningOverview({
  progress,
  guideCount,
}: {
  progress: MaterialProgress;
  guideCount: number;
}) {
  const stats: { icon: typeof Layers; value: string; label: string }[] = [];

  if (progress.cardsTotal > 0) {
    stats.push({
      icon: Layers,
      value: String(progress.cardsTotal),
      label: `Flashcard${progress.cardsTotal === 1 ? "" : "s"} created`,
    });
    stats.push({
      icon: CheckCircle2,
      value: `${progress.cardsMastered} / ${progress.cardsTotal}`,
      label: "Mastered",
    });
  }
  if (progress.bestQuizScore !== null) {
    stats.push({
      icon: HelpCircle,
      value: `${progress.bestQuizScore}%`,
      label: "Best quiz score",
    });
  }
  if (progress.sessionCount > 0) {
    stats.push({
      icon: Repeat,
      value: String(progress.sessionCount),
      label: `Study session${progress.sessionCount === 1 ? "" : "s"}`,
    });
  }
  if (guideCount > 0) {
    stats.push({
      icon: BookOpen,
      value: String(guideCount),
      label: `Guide${guideCount === 1 ? "" : "s"} & reviews`,
    });
  }

  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.slice(0, 4).map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-2xl border border-border bg-surface-solid p-4 shadow-soft"
        >
          <s.icon className="h-4 w-4 text-muted" />
          <p className="mt-2 text-xl font-extrabold tabular-nums">{s.value}</p>
          <p className="text-xs font-semibold text-muted">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
