"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Flag, Target } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { goalIsMet } from "@/lib/materials/progress";
import { useStore } from "@/lib/store-context";
import type { MaterialGoalType, MaterialProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

const GOAL_OPTIONS: { type: MaterialGoalType; label: string }[] = [
  { type: "review-all", label: "Review all flashcards" },
  { type: "quiz-80", label: "Score 80%+ on the quiz" },
  { type: "master-100", label: "Master 100% of cards" },
  { type: "date", label: "Master this material by a date" },
];

function goalLabel(type: MaterialGoalType, date?: string | null): string {
  switch (type) {
    case "review-all":
      return "Review all flashcards";
    case "quiz-80":
      return "Score 80%+ on the practice quiz";
    case "master-100":
      return "Master 100% of the flashcards";
    case "date":
      return date
        ? `Master this material by ${new Date(date + "T00:00:00").toLocaleDateString(
            undefined,
            { month: "long", day: "numeric" },
          )}`
        : "Master this material by a date";
  }
}

export function MaterialGoalCard({
  materialId,
  progress,
}: {
  materialId: string;
  progress: MaterialProgress;
}) {
  const { setMaterialGoal, clearMaterialGoal, snapshot } = useStore();
  const goal = progress.goal;
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<MaterialGoalType>("review-all");
  const [date, setDate] = useState("");

  const met = goal ? goalIsMet(snapshot, materialId, goal, progress) : false;

  return (
    <div className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted">
          <Target className="h-4 w-4" /> Goal
        </h2>
        {goal && !editing && (
          <button
            onClick={() => clearMaterialGoal(materialId)}
            className="text-xs font-semibold text-muted hover:text-accent"
          >
            Remove
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-3"
          >
            <div className="space-y-2">
              {GOAL_OPTIONS.map((o) => (
                <button
                  key={o.type}
                  onClick={() => setChoice(o.type)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors",
                    choice === o.type
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border-strong hover:bg-foreground/5",
                  )}
                >
                  {choice === o.type && <Check className="h-4 w-4" />}
                  {o.label}
                </button>
              ))}
            </div>
            {choice === "date" && (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={choice === "date" && !date}
                onClick={() => {
                  setMaterialGoal(materialId, {
                    type: choice,
                    targetDate: choice === "date" ? date : null,
                  });
                  setEditing(false);
                }}
              >
                Set goal
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : goal ? (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3"
          >
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3",
                met
                  ? "border-success/40 bg-success/8"
                  : "border-border bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                  met
                    ? "bg-success/15 text-success-strong dark:text-success"
                    : "bg-primary/12 text-primary",
                )}
              >
                {met ? <Check className="h-5 w-5" /> : <Flag className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-sm font-bold">
                  {goalLabel(goal.type, goal.targetDate)}
                </p>
                <p className="text-xs text-muted">
                  {met ? "Goal reached — nice work!" : "In progress"}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3"
          >
            <p className="text-sm text-muted">
              Set a target to stay accountable with this material.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setEditing(true)}
            >
              <Flag className="h-4 w-4" /> Set a goal
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {goal && !editing && (
        <button
          onClick={() => {
            setChoice(goal.type);
            setDate(goal.targetDate ?? "");
            setEditing(true);
          }}
          className="mt-2 text-xs font-semibold text-primary hover:underline"
        >
          Change goal
        </button>
      )}
    </div>
  );
}
