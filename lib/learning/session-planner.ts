/**
 * buildDailyLearningPlan() — a deterministic, time-budgeted session plan.
 *
 * Ordering is fixed (never random):
 *   1. Review everything that's due
 *   2. Fix the biggest weakness
 *   3. Continue active learning
 *   4. Optional knowledge check
 *
 * The plan adapts to real activity: a learner who only studies Biology gets a
 * Biology plan, not a Language one. Nothing due → no review step. No quizzes →
 * no quiz step. Short budgets are never overloaded.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type {
  DailyPlan,
  DailyPlanStep,
  SessionPlanInput,
  TimeBudget,
} from "@/lib/learning/types";
import { TIME_BUDGETS } from "@/lib/learning/types";
import {
  dueReviews,
  inProgressItems,
  knowledgeChecks,
  buildRecommendations,
} from "@/lib/learning/recommendations";
import { detectWeaknesses } from "@/lib/learning/weaknesses";
import { activeSources } from "@/lib/learning/progress";

const STEP_CAP: Record<TimeBudget, number> = { 5: 1, 10: 2, 15: 3, 30: 5 };

function nearestBudget(minutes: number): TimeBudget {
  return TIME_BUDGETS.reduce((best, b) =>
    Math.abs(b - minutes) < Math.abs(best - minutes) ? b : best,
  );
}

export function assemblePlanInput(
  snap: DatabaseSnapshot,
  availableMinutes = 15,
): SessionPlanInput {
  return {
    availableMinutes,
    activeSources: activeSources(snap),
    dueReviews: dueReviews(snap),
    weaknesses: detectWeaknesses(snap),
    inProgress: inProgressItems(snap),
    knowledgeChecks: knowledgeChecks(snap),
  };
}

/** Pure — turns an already-assembled input into an ordered plan. */
export function planFromInput(input: SessionPlanInput): DailyPlan {
  const budgetRaw = input.availableMinutes ?? 15;
  const budget = nearestBudget(budgetRaw);
  const stepCap = STEP_CAP[budget];

  const ordered: DailyPlanStep[] = [];

  // 1. review due
  for (const d of input.dueReviews) {
    ordered.push({
      id: `plan-review-${d.sourceType}-${d.sourceId}`,
      kind: "review-due",
      icon: d.sourceType === "language" ? "🗣️" : "🔁",
      title: "Review",
      detail: `${d.count} ${d.sourceType === "language" ? "word" : "card"}${d.count === 1 ? "" : "s"} due in ${d.label}`,
      reason: "Spaced repetition works best when you review on schedule.",
      estimatedMinutes: d.estimatedMinutes,
      sourceType: d.sourceType,
      sourceId: d.sourceId,
      action: d.action,
    });
  }

  // 2. biggest weakness (up to 2, only for larger budgets)
  const weaknessLimit = budget >= 15 ? 2 : 1;
  for (const w of input.weaknesses.slice(0, weaknessLimit)) {
    ordered.push({
      id: `plan-weak-${w.id}`,
      kind: "fix-weakness",
      icon: "🎯",
      title: "Strengthen",
      detail: w.title,
      reason: w.evidence,
      estimatedMinutes: w.estimatedMinutes,
      sourceType: w.sourceType,
      sourceId: w.sourceId,
      action: w.action,
    });
  }

  // 3. continue active learning (1, or 2 at 30 min)
  const continueLimit = budget >= 30 ? 2 : 1;
  for (const p of input.inProgress.slice(0, continueLimit)) {
    ordered.push({
      id: `plan-continue-${p.sourceType}-${p.sourceId}`,
      kind: "continue",
      icon: "▶️",
      title: "Continue",
      detail: p.label,
      reason: p.detail,
      estimatedMinutes: p.estimatedMinutes,
      sourceType: p.sourceType,
      sourceId: p.sourceId,
      action: p.action,
    });
  }

  // 4. optional knowledge check (only when there's room)
  if (budget >= 15) {
    const check = input.knowledgeChecks?.[0];
    if (check) {
      ordered.push({
        id: `plan-check-${check.sourceId ?? check.id}`,
        kind: "knowledge-check",
        icon: "📝",
        title: "Test",
        detail: check.title.replace(/^Test your knowledge:\s*/, ""),
        reason: check.reason.text,
        estimatedMinutes: check.estimatedMinutes ?? 6,
        sourceType: check.sourceType,
        sourceId: check.sourceId,
        action: check.action,
      });
    }
  }

  // trim to budget — never overload a short session
  const steps: DailyPlanStep[] = [];
  let total = 0;
  for (const step of ordered) {
    if (steps.length >= stepCap) break;
    if (steps.length > 0 && total + step.estimatedMinutes > budget + 5) continue;
    steps.push(step);
    total += step.estimatedMinutes;
  }

  return {
    steps,
    totalMinutes: total,
    availableMinutes: budget,
    empty: steps.length === 0,
  };
}

/** Convenience: assemble from the snapshot and plan in one call. */
export function buildDailyLearningPlan(
  snap: DatabaseSnapshot,
  availableMinutes = 15,
): DailyPlan {
  const plan = planFromInput(assemblePlanInput(snap, availableMinutes));
  if (!plan.empty) return plan;

  // Nothing scheduled — offer a reasonable next action, don't fabricate work.
  const next = buildRecommendations(snap)[0];
  return {
    ...plan,
    emptyReason: next
      ? next.reason.text
      : "You're all caught up. Add new material or a language to keep going.",
  };
}
