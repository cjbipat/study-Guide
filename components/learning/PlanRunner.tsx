"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  PartyPopper,
  SkipForward,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useFireworks } from "@/components/fireworks/fireworks-context";
import { useStore } from "@/lib/store-context";
import {
  loadPlanRun,
  savePlanRun,
  clearPlanRun,
  resolveStatus,
  planRunProgress,
  setStepStatus,
  type PlanRun,
  type StepStatus,
} from "@/lib/learning/plan-runner";
import { cn } from "@/lib/utils";

export function PlanRunner() {
  const { ready, snapshot } = useStore();
  const { celebrate } = useFireworks();
  const [run, setRun] = useState<PlanRun | null>(null);
  const [loaded, setLoaded] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    setRun(loadPlanRun());
    setLoaded(true);
  }, []);

  // Auto-detect completed steps from real activity whenever the snapshot changes.
  const status: Record<string, StepStatus> = useMemo(() => {
    if (!run) return {};
    return resolveStatus(snapshot, run);
  }, [run, snapshot]);

  useEffect(() => {
    if (!run) return;
    const changed = run.steps.some((s) => run.status[s.id] !== status[s.id]);
    if (changed) {
      const next = { ...run, status };
      savePlanRun(next);
      setRun(next);
    }
  }, [run, status]);

  const progress = run ? planRunProgress(run, status) : null;

  // Fireworks — only for a meaningful finish: every step actually completed
  // (none skipped) and a plan of real substance.
  useEffect(() => {
    if (!run || !progress || celebratedRef.current) return;
    if (progress.complete && progress.skipped === 0 && progress.total >= 3) {
      celebratedRef.current = true;
      celebrate({ intensity: "medium", durationMs: 1600 });
    }
  }, [run, progress, celebrate]);

  if (!ready || !loaded) return <PageSkeleton />;

  if (!run || run.steps.length === 0) {
    return (
      <Shell>
        <div className="rounded-3xl border border-dashed border-border bg-surface-solid p-10 text-center">
          <p className="text-lg font-bold">No active plan</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Build today&apos;s plan from your dashboard and press{" "}
            <span className="font-semibold">Start today&apos;s plan</span>.
          </p>
          <Button href="/dashboard" className="mt-6">
            Back to dashboard
          </Button>
        </div>
      </Shell>
    );
  }

  const setStatus = (stepId: string, s: StepStatus) => {
    setRun(setStepStatus(run, stepId, s));
  };

  /* ---- completion screen ---- */
  if (progress && progress.complete) {
    const doneSteps = run.steps.filter((s) => status[s.id] === "done");
    const skippedSteps = run.steps.filter((s) => status[s.id] === "skipped");
    return (
      <Shell>
        <div className="rounded-3xl border border-success/30 bg-gradient-to-br from-success/10 via-surface-solid to-surface-solid p-8 text-center shadow-glow-success">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/15 text-success-strong dark:text-success">
            <PartyPopper className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            Today&apos;s learning complete!
          </h1>
          <p className="mt-1 text-muted">
            {doneSteps.length} of {run.steps.length} step
            {run.steps.length === 1 ? "" : "s"} done · ~{progress.minutesDone} min
          </p>

          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left">
            {doneSteps.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-success-strong dark:text-success" aria-hidden />
                <span className="font-semibold">{s.title}:</span>
                <span className="truncate text-muted">{s.detail}</span>
              </li>
            ))}
            {skippedSteps.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm text-muted-2">
                <SkipForward className="h-4 w-4 shrink-0" aria-hidden />
                <span>{s.title}:</span>
                <span className="truncate">{s.detail} (skipped)</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              href="/dashboard"
              onClick={() => clearPlanRun()}
              size="lg"
            >
              Back to dashboard
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  const current = run.steps[progress!.currentIndex];

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <span className="text-sm font-semibold text-muted">
          {progress!.handled} / {progress!.total} done
        </span>
      </div>

      {/* progress bar */}
      <div className="mb-8 h-2 overflow-hidden rounded-full bg-foreground/8">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(progress!.handled / progress!.total) * 100}%` }}
        />
      </div>

      {/* current step */}
      {current && (
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface-solid to-surface-solid p-6 shadow-glow sm:p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Step {progress!.currentIndex + 1} of {progress!.total}
          </p>
          <div className="mt-3 flex items-start gap-4">
            <span className="text-3xl" aria-hidden>
              {current.icon}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight">
                {current.title}: {current.detail}
              </h1>
              <p className="mt-2 text-muted">{current.reason}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
                <Clock className="h-4 w-4" aria-hidden />~{current.estimatedMinutes} min
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={current.action.href} size="lg">
              {current.action.label} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setStatus(current.id, "done")}
            >
              <Check className="h-4 w-4" /> Mark done
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setStatus(current.id, "skipped")}
            >
              <SkipForward className="h-4 w-4" /> Skip
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-2">
            Come back to this page after finishing — completed steps are detected
            automatically.
          </p>
        </div>
      )}

      {/* all steps */}
      <ol className="mt-8 space-y-2">
        {run.steps.map((step, i) => {
          const st = status[step.id];
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3",
                i === progress!.currentIndex
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-surface-solid",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  st === "done"
                    ? "bg-success/15 text-success-strong dark:text-success"
                    : st === "skipped"
                      ? "bg-foreground/8 text-muted-2"
                      : "bg-foreground/6 text-muted",
                )}
              >
                {st === "done" ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : st === "skipped" ? (
                  <SkipForward className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  i + 1
                )}
              </span>
              <span className="text-lg" aria-hidden>
                {step.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {step.title}: <span className="font-normal text-muted">{step.detail}</span>
                </p>
              </div>
              {st === "done" && (
                <span className="shrink-0 text-xs font-bold text-success-strong dark:text-success">
                  Done
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => {
            clearPlanRun();
            setRun(null);
          }}
          className="text-sm font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Exit plan
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10 sm:px-6">{children}</div>
  );
}
