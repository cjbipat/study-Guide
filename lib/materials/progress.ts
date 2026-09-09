/**
 * Material progress + mastery — the "Learning Hub" computation layer.
 *
 * Every number here is derived from real stored activity (cards, reviews,
 * sessions, quiz attempts, the activity log). Nothing is fabricated. When there
 * isn't enough data to say something honest, the value is `null` and callers
 * show an empty state instead.
 */

import type {
  Card,
  DatabaseSnapshot,
  LearningActivity,
  LearningItem,
  MaterialGoal,
  MaterialMastery,
  MaterialProgress,
  MaterialStatus,
  StudyMaterial,
} from "@/lib/types";
import { cardMastery, isDue, isNew } from "@/lib/study/scheduler";
import { extractTopics } from "@/lib/materials/processor";
import { bestQuizScoreForSource } from "@/lib/quiz/selectors";

/** A card counts as "mastered" once it's genuinely stuck (spaced far out). */
export const MASTERED_THRESHOLD = 80;

export function cardsForMaterial(
  snap: DatabaseSnapshot,
  materialId: string,
): Card[] {
  return snap.cards.filter((c) => c.sourceMaterialId === materialId);
}

export function learningItemsForMaterialId(
  snap: DatabaseSnapshot,
  materialId: string,
): LearningItem[] {
  return snap.learningItems.filter((i) => i.materialId === materialId);
}

export function materialActivities(
  snap: DatabaseSnapshot,
  materialId: string,
): LearningActivity[] {
  return snap.activities
    .filter((a) => a.materialId === materialId)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function goalFor(
  snap: DatabaseSnapshot,
  materialId: string,
): MaterialGoal | null {
  return snap.goals.find((g) => g.materialId === materialId) ?? null;
}

/**
 * Mastery for one material.
 *
 * - No flashcards and no quiz attempt → `score: null` ("not studied yet").
 * - Flashcards exist but never reviewed and no quiz → `score: null` too — a
 *   created-but-untouched tool isn't progress.
 * - Otherwise: 70% average card mastery + 30% best quiz score (whichever exist).
 */
export function materialMastery(
  snap: DatabaseSnapshot,
  materialId: string,
): MaterialMastery {
  const cards = cardsForMaterial(snap, materialId);
  const items = learningItemsForMaterialId(snap, materialId);

  // Best score across every quiz built from this material (universal quiz
  // system), plus any legacy LearningItem quiz score.
  const legacyQuizScores = items
    .filter((i) => i.type === "quiz" && i.lastScore && i.lastScore.total > 0)
    .map((i) => (i.lastScore!.correct / i.lastScore!.total) * 100);
  const universal = bestQuizScoreForSource(snap, "material", materialId);
  const allQuizScores = [
    ...legacyQuizScores,
    ...(universal !== null ? [universal] : []),
  ];
  const bestQuizScore = allQuizScores.length
    ? Math.round(Math.max(...allQuizScores))
    : null;

  const sessionCount = snap.activities.filter(
    (a) => a.materialId === materialId && a.type === "flashcard-session",
  ).length;

  const reviewedThese = snap.reviews.some((r) => {
    const card = snap.cards.find((c) => c.id === r.cardId);
    return card?.sourceMaterialId === materialId;
  });

  const hasActivity = sessionCount > 0 || bestQuizScore !== null || reviewedThese;

  const cardsTotal = cards.length;
  const cardMasteries = cards.map(cardMastery);
  const cardsMastered = cardMasteries.filter((m) => m >= MASTERED_THRESHOLD).length;
  const avgCardMastery = cardsTotal
    ? Math.round(cardMasteries.reduce((a, b) => a + b, 0) / cardsTotal)
    : 0;

  let score: number | null = null;
  if (hasActivity) {
    if (cardsTotal && bestQuizScore !== null) {
      score = Math.round(avgCardMastery * 0.7 + bestQuizScore * 0.3);
    } else if (cardsTotal) {
      score = avgCardMastery;
    } else if (bestQuizScore !== null) {
      score = bestQuizScore;
    }
  }

  const toImprove = Math.min(
    6,
    cards.filter((c) => cardMastery(c) < MASTERED_THRESHOLD).length,
  );

  return {
    score,
    cardsTotal,
    cardsMastered,
    bestQuizScore,
    sessionCount,
    hasActivity,
    toImprove,
  };
}

export function goalIsMet(
  snap: DatabaseSnapshot,
  materialId: string,
  goal: MaterialGoal,
  m: MaterialMastery,
): boolean {
  switch (goal.type) {
    case "master-100":
      return m.score === 100;
    case "quiz-80":
      return (m.bestQuizScore ?? 0) >= 80;
    case "review-all":
      return m.cardsTotal > 0 && m.cardsMastered === m.cardsTotal;
    case "date":
      // a date goal is "met" only when the underlying learning is done
      return m.score !== null && m.score >= 90;
    default:
      return false;
  }
}

/** NEW → LEARNING → REVIEWING → MASTERED, from real mastery + goal. */
export function getMaterialStatus(
  m: MaterialMastery,
  goalMet: boolean,
): MaterialStatus {
  if (goalMet) return "mastered";
  if (m.score === null) return "new";
  if (m.score >= 100) return "mastered";
  if (m.score >= 70) return "reviewing";
  return "learning";
}

export function lastStudiedForMaterial(
  snap: DatabaseSnapshot,
  materialId: string,
): string | null {
  const acts = snap.activities.filter(
    (a) =>
      a.materialId === materialId &&
      (a.type === "flashcard-session" || a.type === "quiz-attempt"),
  );
  if (!acts.length) return null;
  return acts.reduce((latest, a) => (a.at > latest ? a.at : latest), acts[0].at);
}

export function materialProgress(
  snap: DatabaseSnapshot,
  material: StudyMaterial,
): MaterialProgress {
  const m = materialMastery(snap, material.id);
  const goal = goalFor(snap, material.id);
  const goalMet = goal ? goalIsMet(snap, material.id, goal, m) : false;
  const cards = cardsForMaterial(snap, material.id);
  const now = new Date();

  return {
    ...m,
    status: getMaterialStatus(m, goalMet),
    lastStudiedAt: lastStudiedForMaterial(snap, material.id),
    dueCount: cards.filter((c) => !isNew(c) && isDue(c, now)).length,
    topics: extractTopics(material),
    goal,
  };
}

/* ------------------------------------------------------------------ */
/*  Mastery milestones → proportional celebrations                     */
/* ------------------------------------------------------------------ */

export type Milestone = 25 | 50 | 75 | 100;

export function crossedMilestone(
  before: number | null,
  after: number | null,
): Milestone | null {
  if (after === null) return null;
  const b = before ?? 0;
  for (const m of [100, 75, 50, 25] as Milestone[]) {
    if (b < m && after >= m) return m;
  }
  return null;
}

export function milestoneCelebration(m: Milestone): {
  intensity: "low" | "medium" | "high";
  durationMs: number;
} {
  switch (m) {
    case 25:
      return { intensity: "low", durationMs: 1100 };
    case 50:
      return { intensity: "medium", durationMs: 1500 };
    case 75:
      return { intensity: "high", durationMs: 1900 };
    case 100:
      return { intensity: "high", durationMs: 2600 };
  }
}

/* ------------------------------------------------------------------ */
/*  Global (dashboard) roll-up                                         */
/* ------------------------------------------------------------------ */

export interface GlobalLearning {
  materialCount: number;
  learning: number;
  reviewing: number;
  mastered: number;
  newCount: number;
  totalMastery: number | null; // avg of scored materials
}

export function globalLearning(snap: DatabaseSnapshot): GlobalLearning {
  const progresses = snap.materials.map((m) => materialProgress(snap, m));
  const scored = progresses.filter((p) => p.score !== null) as {
    score: number;
    status: MaterialStatus;
  }[];
  return {
    materialCount: snap.materials.length,
    learning: progresses.filter((p) => p.status === "learning").length,
    reviewing: progresses.filter((p) => p.status === "reviewing").length,
    mastered: progresses.filter((p) => p.status === "mastered").length,
    newCount: progresses.filter((p) => p.status === "new").length,
    totalMastery: scored.length
      ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length)
      : null,
  };
}
