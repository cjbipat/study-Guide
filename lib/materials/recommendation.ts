/**
 * `getRecommendedStudyAction()` — the deterministic "what should I do next?"
 * brain for a single material, plus a global variant for the dashboard.
 *
 * All inputs are real stored data. UI components must not re-derive this logic.
 */

import type {
  DatabaseSnapshot,
  StudyMaterial,
  StudyRecommendation,
} from "@/lib/types";
import { StudyMaterialService } from "@/lib/materials/processor";
import {
  cardsForMaterial,
  learningItemsForMaterialId,
  materialMastery,
} from "@/lib/materials/progress";
import {
  latestQuizAttemptForSource,
  quizzesForSource,
} from "@/lib/quiz/selectors";

function unfinishedSessionForDeck(
  snap: DatabaseSnapshot,
  deckId: string | null,
): string | null {
  if (!deckId) return null;
  const s = snap.sessions.find(
    (x) => x.deckId === deckId && !x.endedAt && x.cardsReviewed > 0,
  );
  return s ? s.id : null;
}

export function getRecommendedStudyAction(
  snap: DatabaseSnapshot,
  material: StudyMaterial,
): StudyRecommendation {
  const m = materialMastery(snap, material.id);
  const items = learningItemsForMaterialId(snap, material.id);
  const cards = cardsForMaterial(snap, material.id);
  const flashcardItem = items.find((i) => i.type === "flashcards");
  const materialQuizzes = quizzesForSource(snap, "material", material.id);
  const latestQuiz = latestQuizAttemptForSource(snap, "material", material.id);
  const canProcess = StudyMaterialService.canGenerate(material);

  const studyHref = (extra = "") =>
    flashcardItem?.deckId
      ? `/study/${flashcardItem.deckId}?item=${flashcardItem.id}${extra}`
      : material.deckId
        ? `/study/${material.deckId}`
        : `/materials/${material.id}`;

  // 1. resume an interrupted session
  const openSession = unfinishedSessionForDeck(
    snap,
    flashcardItem?.deckId ?? material.deckId,
  );
  if (openSession) {
    return {
      kind: "continue-session",
      label: "Continue your session",
      reason: "You have a study session in progress.",
      href: studyHref(),
      tone: "primary",
    };
  }

  // 2. no flashcards yet
  if (cards.length === 0) {
    return canProcess
      ? {
          kind: "create-flashcards",
          label: "Create flashcards",
          reason: "Turn this material into cards you can study.",
          href: `/materials/${material.id}#create`,
          tone: "primary",
        }
      : {
          kind: "manual-flashcards",
          label: "Add flashcards",
          reason: "Build cards by hand from this source.",
          href: material.deckId
            ? `/decks/${material.deckId}/cards/new?source=${material.id}`
            : `/materials/${material.id}#create`,
          tone: "primary",
        };
  }

  // 3. flashcards exist but nothing has been studied
  if (!m.hasActivity) {
    return {
      kind: "start-flashcards",
      label: "Start flashcards",
      reason: `${cards.length} cards are ready. Begin your first session.`,
      href: studyHref(),
      tone: "primary",
    };
  }

  // 4. cards are due for review
  const dueCount = cards.filter((c) => {
    const due = new Date(c.dueAt).getTime() <= Date.now();
    const seen = c.repetitions > 0 || c.lastReviewedAt !== null;
    return seen && due;
  }).length;
  if (dueCount > 0) {
    return {
      kind: "review-due",
      label: `Review ${dueCount} due card${dueCount === 1 ? "" : "s"}`,
      reason: "These cards are scheduled for review right now.",
      href: studyHref(),
      tone: "primary",
    };
  }

  const masteredRatio = m.cardsTotal ? m.cardsMastered / m.cardsTotal : 0;
  const lastQuiz = latestQuiz ? latestQuiz.attempt.score : null;

  // 5. weak quiz → back to the cards
  if (lastQuiz !== null && lastQuiz < 70) {
    return {
      kind: "review-weak",
      label: "Review your flashcards",
      reason: `Your last quiz was ${lastQuiz}% — a refresher will help.`,
      href: studyHref(),
      tone: "accent",
    };
  }

  // 6. cards mostly mastered → test yourself
  if (masteredRatio >= 0.8) {
    if (materialQuizzes.length > 0 && lastQuiz === null) {
      return {
        kind: "take-quiz",
        label: "Take the practice quiz",
        reason: "You know these cards — check yourself with the quiz.",
        href: `/quizzes/${materialQuizzes[0].id}`,
        tone: "success",
      };
    }
    if (materialQuizzes.length === 0) {
      return {
        kind: "create-quiz",
        label: "Create a practice quiz",
        reason: "Your cards are solid. A quiz will confirm it.",
        href: `/quizzes/create?source=material&id=${material.id}`,
        tone: "success",
      };
    }
  }

  // 7. keep the spacing going
  return {
    kind: "review-again",
    label: "Review again",
    reason: "Keep the material fresh with another pass.",
    href: studyHref(),
    tone: "primary",
  };
}

export interface GlobalRecommendation {
  material: StudyMaterial;
  recommendation: StudyRecommendation;
  dueCount: number;
}

/** The single best next action across every material, for the dashboard. */
export function getGlobalRecommendation(
  snap: DatabaseSnapshot,
): GlobalRecommendation | null {
  if (snap.materials.length === 0) return null;

  const ranked = snap.materials
    .map((material) => {
      const cards = cardsForMaterial(snap, material.id);
      const dueCount = cards.filter((c) => {
        const due = new Date(c.dueAt).getTime() <= Date.now();
        const seen = c.repetitions > 0 || c.lastReviewedAt !== null;
        return seen && due;
      }).length;
      const m = materialMastery(snap, material.id);
      const rec = getRecommendedStudyAction(snap, material);
      // priority: continue > due > start > everything else, then lower mastery first
      let priority = 0;
      if (rec.kind === "continue-session") priority = 100;
      else if (rec.kind === "review-due") priority = 80 + Math.min(dueCount, 15);
      else if (rec.kind === "start-flashcards") priority = 60;
      else if (rec.kind === "review-weak") priority = 55;
      else if (rec.kind === "take-quiz") priority = 40;
      else if (rec.kind === "create-flashcards") priority = 30;
      else priority = 10;
      const masteryTiebreak = m.score === null ? 50 : 100 - m.score;
      return { material, recommendation: rec, dueCount, priority, masteryTiebreak };
    })
    .sort(
      (a, b) => b.priority - a.priority || b.masteryTiebreak - a.masteryTiebreak,
    );

  const top = ranked[0];
  return {
    material: top.material,
    recommendation: top.recommendation,
    dueCount: top.dueCount,
  };
}
