"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { ProgressRing } from "@/components/ui/ProgressRing";
import { STATUS_META } from "@/components/materials/status";
import type { MaterialProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

function masteryCopy(score: number): string {
  if (score >= 100) return "You've mastered this material.";
  if (score >= 85) return "Almost there — a couple more passes will lock it in.";
  if (score >= 60) return "You're making great progress.";
  if (score >= 30) return "You're building a foundation. Keep going.";
  return "Early days — every session moves the needle.";
}

export function MaterialMasteryCard({
  progress,
  hasFlashcards,
}: {
  progress: MaterialProgress;
  hasFlashcards: boolean;
}) {
  const { score, cardsMastered, cardsTotal, toImprove } = progress;
  const status = STATUS_META[progress.status];

  if (score === null) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface-solid p-7 text-center shadow-soft sm:flex-row sm:text-left">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-dashed border-border text-2xl font-extrabold text-muted-2">
          —
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Material Mastery
          </p>
          <p className="mt-1 text-xl font-extrabold">Not studied yet</p>
          <p className="mt-1 text-sm text-muted">
            {hasFlashcards
              ? "Start your first study session and we'll begin tracking your mastery."
              : "Create a learning tool and start your first session to see your mastery here."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-surface-solid p-7 text-center shadow-soft sm:flex-row sm:text-left">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
      >
        <ProgressRing
          value={score}
          size={132}
          stroke={13}
          colorClass={
            score >= 100
              ? "text-success"
              : score >= 70
                ? "text-warning"
                : "text-primary"
          }
        >
          <div>
            <div className="text-3xl font-extrabold tabular-nums">{score}%</div>
            <div className="text-[11px] font-semibold text-muted">mastery</div>
          </div>
        </ProgressRing>
      </motion.div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Material Mastery
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
              status.className,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
        </div>
        <p className="mt-1.5 text-lg font-extrabold">{masteryCopy(score)}</p>
        {cardsTotal > 0 && (
          <p className="mt-1 text-sm text-muted">
            <span className="font-bold text-foreground">
              {cardsMastered} / {cardsTotal}
            </span>{" "}
            flashcards mastered.
            {toImprove > 0 && score < 100 && (
              <>
                {" "}
                Review{" "}
                <span className="font-bold text-foreground">
                  {toImprove} more
                </span>{" "}
                to raise your mastery.
              </>
            )}
          </p>
        )}
        {progress.bestQuizScore !== null && (
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted sm:justify-start">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Best quiz score: {progress.bestQuizScore}%
          </p>
        )}
      </div>
    </div>
  );
}
