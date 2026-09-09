/**
 * The Universal Progress view — every learning area shown SEPARATELY.
 *
 * No combined percentage across unrelated subjects, no "universal intelligence
 * score". Each area carries its own honest mastery signal (see mastery.ts) and
 * a few factual chips drawn from real counts.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type { LearningAreaProgress, LearningSource } from "@/lib/learning/types";
import {
  materialMasterySignal,
  deckMasterySignal,
  languageMasterySignal,
  quizMasterySignal,
} from "@/lib/learning/mastery";
import { materialMastery, cardsForMaterial } from "@/lib/materials/progress";
import { deckSignals, languageSignals, quizSignals } from "@/lib/learning/selectors";
import { bestQuizScoreForSource } from "@/lib/quiz/selectors";

const RECENT_MS = 14 * 86_400_000;

/* ------------------------------------------------------------------ */
/*  Active sources — what the learner is genuinely engaged with        */
/* ------------------------------------------------------------------ */

export function activeSources(snap: DatabaseSnapshot): LearningSource[] {
  const out: LearningSource[] = [];
  const now = Date.now();

  for (const m of snap.materials) {
    const cards = cardsForMaterial(snap, m.id);
    const mm = materialMastery(snap, m.id);
    const recent = now - Date.parse(m.addedAt) < RECENT_MS;
    if (cards.length > 0 || mm.hasActivity || recent) {
      out.push({
        type: "material",
        id: m.id,
        title: m.name.replace(/\.[a-z0-9]+$/i, ""),
        icon: "📄",
        href: `/materials/${m.id}`,
      });
    }
  }

  for (const d of deckSignals(snap, new Date())) {
    const recent = d.lastStudiedAt
      ? now - Date.parse(d.lastStudiedAt) < RECENT_MS
      : false;
    // skip decks that are only the backing store for a material area
    const isMaterialDeck = snap.materials.some((m) => m.deckId === d.deckId) &&
      snap.learningItems.some((i) => i.deckId === d.deckId && i.type === "flashcards");
    if (isMaterialDeck) continue;
    if (d.dueCount > 0 || d.reviewedCount > 0 || recent) {
      out.push({
        type: "deck",
        id: d.deckId,
        title: d.name,
        icon: d.icon || "🗂️",
        href: `/decks/${d.deckId}`,
      });
    }
  }

  for (const l of languageSignals(snap)) {
    out.push({
      type: "language",
      id: l.profileId,
      title: l.name,
      icon: l.flag,
      href: `/languages/${l.profileId}`,
    });
  }

  for (const q of quizSignals(snap)) {
    if (q.quiz.source.type === "material") continue; // folded into the material
    if (q.attempts.length === 0) continue;
    out.push({
      type: "quiz",
      id: q.quiz.id,
      title: q.quiz.title,
      icon: q.quiz.source.icon || "📝",
      href: `/quizzes/${q.quiz.id}`,
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Per-area progress                                                  */
/* ------------------------------------------------------------------ */

export function getLearningAreas(snap: DatabaseSnapshot): LearningAreaProgress[] {
  const decks = deckSignals(snap, new Date());
  const langs = languageSignals(snap);
  const quizzes = quizSignals(snap);

  return activeSources(snap).map((src): LearningAreaProgress => {
    if (src.type === "material") {
      const cards = cardsForMaterial(snap, src.id);
      const best = bestQuizScoreForSource(snap, "material", src.id);
      const dueCount = cards.filter(
        (c) =>
          (c.repetitions > 0 || c.lastReviewedAt !== null) &&
          Date.parse(c.dueAt) <= Date.now(),
      ).length;
      const meta: string[] = [];
      if (cards.length) meta.push(`${cards.length} flashcard${cards.length === 1 ? "" : "s"}`);
      if (dueCount) meta.push(`${dueCount} due`);
      if (best !== null) meta.push(`best quiz ${best}%`);
      if (!meta.length) meta.push("Study material");
      return {
        sourceType: "material",
        sourceId: src.id,
        icon: src.icon,
        title: src.title,
        mastery: materialMasterySignal(snap, src.id),
        meta,
        action: {
          label: "Open",
          href: src.href,
        },
      };
    }

    if (src.type === "deck") {
      const d = decks.find((x) => x.deckId === src.id)!;
      const meta: string[] = [];
      if (d.dueCount) meta.push(`${d.dueCount} due`);
      if (d.newCount) meta.push(`${d.newCount} new`);
      meta.push(`${d.cardCount} card${d.cardCount === 1 ? "" : "s"}`);
      return {
        sourceType: "deck",
        sourceId: src.id,
        icon: src.icon,
        title: src.title,
        mastery: deckMasterySignal(snap, src.id),
        meta,
        action: {
          label: d.dueCount > 0 ? "Review" : "Study",
          href: d.dueCount > 0 || d.cardCount > 0 ? `/study/${src.id}` : src.href,
        },
      };
    }

    if (src.type === "language") {
      const l = langs.find((x) => x.profileId === src.id)!;
      const meta: string[] = [];
      if (l.dueCount) meta.push(`${l.dueCount} word${l.dueCount === 1 ? "" : "s"} due`);
      if (l.streak > 0) meta.push(`${l.streak}-day streak`);
      if (l.newCount && !l.dueCount) meta.push(`${l.newCount} new`);
      if (!meta.length) meta.push(`${l.vocabTotal} words`);
      return {
        sourceType: "language",
        sourceId: src.id,
        icon: src.icon,
        title: src.title,
        mastery: languageMasterySignal(snap, src.id),
        meta,
        action: {
          label: l.dueCount > 0 ? "Review" : "Continue",
          href: l.dueCount > 0 ? `/languages/${src.id}/practice/review` : `/languages/${src.id}/session`,
        },
      };
    }

    // quiz
    const q = quizzes.find((x) => x.quiz.id === src.id)!;
    const meta: string[] = [
      `${q.attempts.length} attempt${q.attempts.length === 1 ? "" : "s"}`,
    ];
    if (q.bestScore !== null) meta.push(`best ${q.bestScore}%`);
    return {
      sourceType: "quiz",
      sourceId: src.id,
      icon: src.icon,
      title: src.title,
      mastery: quizMasterySignal(snap, src.id),
      meta,
      action: { label: "Retake", href: `/quizzes/${src.id}` },
    };
  });
}
