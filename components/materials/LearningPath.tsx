"use client";

import { motion } from "framer-motion";
import { Check, Circle, Lock } from "lucide-react";

import type { MaterialProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

type StepState = "done" | "current" | "locked" | "todo";

interface Step {
  key: string;
  label: string;
  detail: string;
  state: StepState;
}

export function buildPathSteps(
  progress: MaterialProgress,
  hasQuiz: boolean,
): Step[] {
  const { cardsTotal, cardsMastered, bestQuizScore, status } = progress;
  const hasCards = cardsTotal > 0;
  const studied = progress.hasActivity && status !== "new";
  const studyDone = status === "reviewing" || status === "mastered";
  const quizDone = bestQuizScore !== null;
  const mastered = status === "mastered";

  return [
    {
      key: "upload",
      label: "Upload",
      detail: "Source added",
      state: "done",
    },
    {
      key: "flashcards",
      label: "Flashcards",
      detail: hasCards ? `${cardsTotal} created` : "Not created",
      state: hasCards ? "done" : "current",
    },
    {
      key: "study",
      label: "Study",
      detail: hasCards
        ? `${cardsMastered}/${cardsTotal} mastered`
        : "Locked",
      state: !hasCards
        ? "locked"
        : studyDone
          ? "done"
          : studied
            ? "current"
            : hasCards
              ? "current"
              : "todo",
    },
    {
      key: "quiz",
      label: "Quiz",
      detail: quizDone
        ? `${bestQuizScore}% best`
        : hasQuiz
          ? "Not started"
          : "Not created",
      state: quizDone
        ? "done"
        : !hasCards
          ? "locked"
          : studyDone
            ? "current"
            : "todo",
    },
    {
      key: "mastered",
      label: "Mastered",
      detail: mastered ? "Complete" : "Locked",
      state: mastered ? "done" : "locked",
    },
  ];
}

function Node({ state }: { state: StepState }) {
  return (
    <div
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition-colors",
        state === "done" && "border-success bg-success text-white",
        state === "current" &&
          "border-primary bg-primary/12 text-primary",
        state === "locked" && "border-border bg-surface-2 text-muted-2",
        state === "todo" && "border-border-strong bg-surface-solid text-muted",
      )}
    >
      {state === "done" && <Check className="h-4 w-4" strokeWidth={3} />}
      {state === "current" && (
        <motion.span
          className="h-2.5 w-2.5 rounded-full bg-primary"
          animate={{ scale: [1, 1.35, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}
      {state === "locked" && <Lock className="h-3.5 w-3.5" />}
      {state === "todo" && <Circle className="h-3 w-3" />}
    </div>
  );
}

export function LearningPath({
  progress,
  hasQuiz,
}: {
  progress: MaterialProgress;
  hasQuiz: boolean;
}) {
  const steps = buildPathSteps(progress, hasQuiz);

  return (
    <div className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
        Learning path
      </h2>

      {/* Desktop: horizontal */}
      <ol className="mt-5 hidden items-start gap-1 md:flex">
        {steps.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-start">
            <div className="flex flex-1 flex-col items-center text-center">
              <Node state={s.state} />
              <p
                className={cn(
                  "mt-2 text-sm font-bold",
                  s.state === "locked" ? "text-muted-2" : "text-foreground",
                )}
              >
                {s.label}
              </p>
              <p className="text-xs text-muted">{s.detail}</p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mt-4 h-0.5 flex-1 rounded-full",
                  steps[i + 1].state === "done" || s.state === "done"
                    ? "bg-success/50"
                    : "bg-border",
                )}
              />
            )}
          </li>
        ))}
      </ol>

      {/* Mobile: vertical */}
      <ol className="mt-5 space-y-0 md:hidden">
        {steps.map((s, i) => (
          <li key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Node state={s.state} />
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "my-1 w-0.5 flex-1 rounded-full",
                    s.state === "done" ? "bg-success/50" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className={cn("pb-4", i === steps.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-bold",
                  s.state === "locked" ? "text-muted-2" : "text-foreground",
                )}
              >
                {s.label}
              </p>
              <p className="text-xs text-muted">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
