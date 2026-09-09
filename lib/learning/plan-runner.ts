/**
 * "Start Today's Plan" execution state.
 *
 * The plan is executable, not a static checklist: each step links to a real
 * existing route, and completion is detected from real stored activity that
 * happened AFTER the plan started (a flashcard session, a quiz attempt, a
 * language review). The learner can also skip or manually tick a step — they
 * are never locked into the plan.
 *
 * Run state is per-device and lives in localStorage (like the audio prefs),
 * not in the snapshot — it's ephemeral UI state, not learning history.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type { DailyPlan, DailyPlanStep } from "@/lib/learning/types";

const KEY = "ember.learning-plan.v1";
const MAX_AGE_MS = 18 * 60 * 60 * 1000;

export type StepStatus = "pending" | "done" | "skipped";

export interface PlanRunStep extends DailyPlanStep {
  /** counts captured at plan start, used as a completion fallback */
  reviewsBaseline: number;
  attemptsBaseline: number;
}

export interface PlanRun {
  startedAt: string;
  startedAtMs: number;
  budget: number;
  steps: PlanRunStep[];
  status: Record<string, StepStatus>;
  /** set once when the learner opens the completion screen */
  celebratedMilestone?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Baseline helpers                                                   */
/* ------------------------------------------------------------------ */

function deckReviewCount(snap: DatabaseSnapshot, deckId: string): number {
  return snap.reviews.filter((r) => r.deckId === deckId).length;
}
function langReviewCount(snap: DatabaseSnapshot, profileId: string): number {
  return snap.languageReviews.filter((r) => r.profileId === profileId).length;
}
function quizIdsForMaterial(snap: DatabaseSnapshot, materialId: string): string[] {
  return snap.quizzes
    .filter((q) => q.source.type === "material" && q.source.id === materialId)
    .map((q) => q.id);
}
function deckIdForMaterial(snap: DatabaseSnapshot, materialId: string): string | null {
  const item = snap.learningItems.find(
    (i) => i.materialId === materialId && i.type === "flashcards" && i.deckId,
  );
  if (item?.deckId) return item.deckId;
  return snap.materials.find((m) => m.id === materialId)?.deckId ?? null;
}

function baselineFor(snap: DatabaseSnapshot, step: DailyPlanStep): {
  reviewsBaseline: number;
  attemptsBaseline: number;
} {
  let reviewsBaseline = 0;
  let attemptsBaseline = 0;
  if (step.sourceType === "deck" && step.sourceId) {
    reviewsBaseline = deckReviewCount(snap, step.sourceId);
  } else if (step.sourceType === "language" && step.sourceId) {
    reviewsBaseline = langReviewCount(snap, step.sourceId);
  } else if (step.sourceType === "material" && step.sourceId) {
    const deckId = deckIdForMaterial(snap, step.sourceId);
    reviewsBaseline = deckId ? deckReviewCount(snap, deckId) : 0;
    attemptsBaseline = snap.quizAttempts.filter((a) =>
      quizIdsForMaterial(snap, step.sourceId!).includes(a.quizId),
    ).length;
  } else if (step.sourceType === "quiz" && step.sourceId) {
    attemptsBaseline = snap.quizAttempts.filter((a) => a.quizId === step.sourceId).length;
  }
  return { reviewsBaseline, attemptsBaseline };
}

/* ------------------------------------------------------------------ */
/*  Completion detection                                               */
/* ------------------------------------------------------------------ */

export function isStepComplete(
  snap: DatabaseSnapshot,
  step: PlanRunStep,
  startedAtMs: number,
): boolean {
  const after = (iso: string) => Date.parse(iso) > startedAtMs;
  const sid = step.sourceId;

  const deckSessionAfter = (deckId: string) =>
    snap.activities.some(
      (a) => a.type === "flashcard-session" && a.deckId === deckId && after(a.at),
    );
  const quizAttemptAfter = (quizIds: string[]) =>
    snap.quizAttempts.some((a) => quizIds.includes(a.quizId) && after(a.finishedAt));
  const langReviewAfter = (profileId: string) =>
    snap.languageReviews.some((r) => r.profileId === profileId && after(r.at)) ||
    snap.languageActivities.some(
      (a) =>
        a.profileId === profileId &&
        a.type === "session-completed" &&
        after(a.at),
    );

  switch (step.kind) {
    case "review-due": {
      if (!sid) return false;
      if (step.sourceType === "language") return langReviewAfter(sid);
      return (
        deckSessionAfter(sid) || deckReviewCount(snap, sid) > step.reviewsBaseline
      );
    }
    case "fix-weakness": {
      if (!sid) return false;
      if (step.sourceType === "language") return langReviewAfter(sid);
      if (step.sourceType === "quiz") return quizAttemptAfter([sid]);
      if (step.sourceType === "material") {
        const deckId = deckIdForMaterial(snap, sid);
        return (
          quizAttemptAfter(quizIdsForMaterial(snap, sid)) ||
          (deckId ? deckSessionAfter(deckId) : false) ||
          (deckId ? deckReviewCount(snap, deckId) > step.reviewsBaseline : false)
        );
      }
      return deckSessionAfter(sid);
    }
    case "continue": {
      if (!sid) return false;
      if (step.sourceType === "language") return langReviewAfter(sid);
      if (step.sourceType === "material") {
        const deckId = deckIdForMaterial(snap, sid);
        return (
          quizAttemptAfter(quizIdsForMaterial(snap, sid)) ||
          (deckId ? deckSessionAfter(deckId) : false)
        );
      }
      return deckSessionAfter(sid);
    }
    case "knowledge-check": {
      if (!sid) return false;
      if (step.sourceType === "quiz") return quizAttemptAfter([sid]);
      return quizAttemptAfter(quizIdsForMaterial(snap, sid));
    }
  }
}

/** Merge auto-detected completion into the stored status (manual wins). */
export function resolveStatus(
  snap: DatabaseSnapshot,
  run: PlanRun,
): Record<string, StepStatus> {
  const next: Record<string, StepStatus> = { ...run.status };
  for (const step of run.steps) {
    if (next[step.id] === "skipped" || next[step.id] === "done") continue;
    if (isStepComplete(snap, step, run.startedAtMs)) next[step.id] = "done";
  }
  return next;
}

export function planRunProgress(run: PlanRun, status: Record<string, StepStatus>) {
  const total = run.steps.length;
  const done = run.steps.filter((s) => status[s.id] === "done").length;
  const skipped = run.steps.filter((s) => status[s.id] === "skipped").length;
  const handled = done + skipped;
  const currentIndex = run.steps.findIndex(
    (s) => status[s.id] !== "done" && status[s.id] !== "skipped",
  );
  return {
    total,
    done,
    skipped,
    handled,
    complete: handled >= total,
    currentIndex: currentIndex === -1 ? total : currentIndex,
    minutesDone: run.steps
      .filter((s) => status[s.id] === "done")
      .reduce((a, s) => a + s.estimatedMinutes, 0),
  };
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

export function startPlanRun(snap: DatabaseSnapshot, plan: DailyPlan): PlanRun {
  const now = new Date();
  const steps: PlanRunStep[] = plan.steps.map((s) => ({
    ...s,
    ...baselineFor(snap, s),
  }));
  const run: PlanRun = {
    startedAt: now.toISOString(),
    startedAtMs: now.getTime(),
    budget: plan.availableMinutes,
    steps,
    status: Object.fromEntries(steps.map((s) => [s.id, "pending" as StepStatus])),
    celebratedMilestone: null,
  };
  savePlanRun(run);
  return run;
}

export function loadPlanRun(): PlanRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const run = JSON.parse(raw) as PlanRun;
    if (!run?.startedAtMs || !Array.isArray(run.steps)) return null;
    if (Date.now() - run.startedAtMs > MAX_AGE_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return run;
  } catch {
    return null;
  }
}

export function savePlanRun(run: PlanRun): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    /* storage unavailable — the plan still works in-memory for this view */
  }
}

export function clearPlanRun(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function setStepStatus(
  run: PlanRun,
  stepId: string,
  status: StepStatus,
): PlanRun {
  const next: PlanRun = {
    ...run,
    status: { ...run.status, [stepId]: status },
  };
  savePlanRun(next);
  return next;
}
