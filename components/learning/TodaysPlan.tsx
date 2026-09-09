"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Clock, Play } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store-context";
import { TIME_BUDGETS, type TimeBudget } from "@/lib/learning/types";
import { buildDailyLearningPlan } from "@/lib/learning/session-planner";
import {
  startPlanRun,
  loadPlanRun,
  resolveStatus,
  planRunProgress,
} from "@/lib/learning/plan-runner";
import { cn } from "@/lib/utils";

const BUDGET_KEY = "ember.learning-plan-budget.v1";

function readBudget(): TimeBudget {
  if (typeof window === "undefined") return 15;
  try {
    const v = Number(window.localStorage.getItem(BUDGET_KEY));
    return (TIME_BUDGETS as readonly number[]).includes(v) ? (v as TimeBudget) : 15;
  } catch {
    return 15;
  }
}

export function TodaysPlan() {
  const { snapshot } = useStore();
  const router = useRouter();
  const [budget, setBudget] = useState<TimeBudget>(15);
  const [resume, setResume] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    setBudget(readBudget());
    const run = loadPlanRun();
    if (run) {
      const p = planRunProgress(run, resolveStatus(snapshot, run));
      if (!p.complete) setResume({ done: p.handled, total: p.total });
    }
  }, [snapshot]);

  const plan = buildDailyLearningPlan(snapshot, budget);

  const pickBudget = (b: TimeBudget) => {
    setBudget(b);
    try {
      window.localStorage.setItem(BUDGET_KEY, String(b));
    } catch {
      /* ignore */
    }
  };

  const start = () => {
    startPlanRun(snapshot, plan);
    router.push("/plan");
  };

  return (
    <section aria-labelledby="plan-heading" className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="plan-heading" className="text-lg font-bold">
          Today&apos;s plan
        </h2>
        <div
          role="radiogroup"
          aria-label="Time available"
          className="flex gap-1 rounded-full border border-border bg-surface-solid p-1"
        >
          {TIME_BUDGETS.map((b) => (
            <button
              key={b}
              role="radio"
              aria-checked={budget === b}
              onClick={() => pickBudget(b)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                budget === b
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {b} min
            </button>
          ))}
        </div>
      </div>

      {resume && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold">
            You have a plan in progress — {resume.done}/{resume.total} steps done.
          </p>
          <Button href="/plan" size="sm">
            Resume plan <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft">
        {plan.empty ? (
          <div className="py-4 text-center">
            <p className="text-lg font-bold">You&apos;re all caught up 🎉</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              {plan.emptyReason ??
                "Nothing is scheduled right now. Add new material or a language to keep going."}
            </p>
          </div>
        ) : (
          <>
            <ol className="space-y-3">
              {plan.steps.map((step, i) => (
                <li key={step.id} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground/6 text-sm font-bold text-muted">
                    {i + 1}
                  </span>
                  <span className="text-xl" aria-hidden>
                    {step.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {step.title}: <span className="font-normal text-muted">{step.detail}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-2">{step.reason}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted">
                    <Clock className="h-3.5 w-3.5" aria-hidden />~{step.estimatedMinutes}m
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <Button onClick={start} size="lg">
                <Play className="h-4 w-4" /> Start today&apos;s plan
              </Button>
              <span className="text-sm font-semibold text-muted">
                {plan.steps.length} step{plan.steps.length === 1 ? "" : "s"} · ~
                {plan.totalMinutes} min total
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
