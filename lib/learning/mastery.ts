/**
 * Honest mastery signals for a learning area.
 *
 * Combines real evidence — flashcard scheduling state, quiz attempt history,
 * language progress — into a label ("Not enough data" / "Learning" /
 * "Improving" / "Strong" / "Active"). A precise percentage is attached ONLY
 * when it wouldn't mislead (e.g. two or more quiz attempts). There is no
 * universal "intelligence score" and unrelated subjects are never combined.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type { LearningSourceType, MasterySignal, MasteryLabel } from "@/lib/learning/types";
import { materialMastery, cardsForMaterial } from "@/lib/materials/progress";
import { deckMastery } from "@/lib/study/scheduler";
import { languageProgress } from "@/lib/language/progress";
import { quizSignals } from "@/lib/learning/selectors";
import { quizzesForSource } from "@/lib/quiz/selectors";

function signal(
  label: MasteryLabel,
  score: number | null,
  headline: string,
  detail: string,
): MasterySignal {
  return { label, score, headline, detail };
}

/** "50% → 83% · ↑ 33% from your first attempt" */
function trendDetail(history: number[]): string {
  if (history.length < 2) return "";
  const first = history[0];
  const last = history[history.length - 1];
  const delta = last - first;
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const base = `${first}% → ${last}%`;
  if (delta === 0) return `${base} · holding steady`;
  return `${base} · ${arrow} ${Math.abs(delta)}% from your first attempt`;
}

/* ------------------------------------------------------------------ */

export function materialMasterySignal(
  snap: DatabaseSnapshot,
  materialId: string,
): MasterySignal {
  const m = materialMastery(snap, materialId);
  const cards = cardsForMaterial(snap, materialId);
  const quizIds = new Set(quizzesForSource(snap, "material", materialId).map((q) => q.id));
  const qs = quizSignals(snap).filter((s) => quizIds.has(s.quiz.id));
  const withAttempts = qs.filter((s) => s.attempts.length > 0);

  if (!m.hasActivity) {
    if (cards.length > 0) {
      return signal(
        "not-enough-data",
        null,
        "Ready to study",
        `${cards.length} flashcard${cards.length === 1 ? "" : "s"} — you haven't studied yet`,
      );
    }
    return signal("not-enough-data", null, "Not started", "No study activity yet");
  }

  // Quiz evidence is the strongest signal when it exists.
  if (withAttempts.length > 0) {
    const primary = withAttempts.reduce((a, b) =>
      (b.lastAttempt?.finishedAt ?? "") > (a.lastAttempt?.finishedAt ?? "") ? b : a,
    );
    const history = primary.scoreHistory;
    if (primary.improving) {
      return signal("improving", null, "Improving", trendDetail(history));
    }
    if (primary.strong) {
      const last = history[history.length - 1];
      return signal(
        "strong",
        history.length >= 2 ? last : null,
        "Strong",
        history.length >= 2
          ? `Last quiz ${last}%${trendDetail(history) ? ` · ${trendDetail(history)}` : ""}`
          : `Last quiz ${last}%`,
      );
    }
    const last = history[history.length - 1];
    return signal(
      "learning",
      history.length >= 2 ? last : null,
      "Learning",
      history.length >= 2 ? trendDetail(history) : `Last quiz ${last}%`,
    );
  }

  // Flashcards studied, no quiz yet — scheduling-based, and we don't show a %
  // as "mastery" because it hasn't been tested.
  if (m.score !== null && m.score >= 80) {
    return signal("strong", null, "Cards well learned", "Test yourself to confirm it");
  }
  return signal("learning", null, "Learning", "Flashcards in progress — not tested yet");
}

export function deckMasterySignal(
  snap: DatabaseSnapshot,
  deckId: string,
): MasterySignal {
  const cards = snap.cards.filter((c) => c.deckId === deckId);
  const reviews = snap.reviews.filter((r) => r.deckId === deckId);
  const seen = cards.filter((c) => c.repetitions > 0 || c.lastReviewedAt !== null);

  if (seen.length === 0 && reviews.length === 0) {
    return signal(
      "not-enough-data",
      null,
      "Ready to study",
      cards.length ? `${cards.length} cards ready` : "No cards yet",
    );
  }

  const score = deckMastery(cards);

  // Trend from the review log, when there's enough of it.
  if (reviews.length >= 8) {
    const ordered = [...reviews].sort(
      (a, b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt),
    );
    const half = Math.floor(ordered.length / 2);
    const earlyAcc =
      ordered.slice(0, half).filter((r) => r.correct).length / half;
    const lateAcc =
      ordered.slice(half).filter((r) => r.correct).length / (ordered.length - half);
    if (lateAcc >= earlyAcc + 0.15) {
      return signal("improving", null, "Improving", "Recall is trending up");
    }
  }

  if (score >= 75) {
    return signal("strong", score, "Strong", `${score}% average card strength`);
  }
  return signal("learning", score, "Learning", `${score}% average card strength`);
}

export function languageMasterySignal(
  snap: DatabaseSnapshot,
  profileId: string,
): MasterySignal {
  const profile = snap.languages.find((p) => p.id === profileId);
  if (!profile) return signal("not-enough-data", null, "Not started", "");
  const prog = languageProgress(snap, profile);
  const recentSession = snap.languageActivities.some(
    (a) =>
      a.profileId === profileId &&
      a.type === "session-completed" &&
      Date.now() - Date.parse(a.at) < 4 * 86_400_000,
  );

  const meta: string[] = [];
  if (prog.dueCount > 0) meta.push(`${prog.dueCount} due`);
  if (prog.streak > 0) meta.push(`${prog.streak}-day streak`);
  const detail = meta.join(" · ") || `${prog.vocabTotal} words`;

  const vocabScore = prog.skills.vocabulary.score;

  if (profile.streak > 0 || recentSession) {
    return signal("active", vocabScore, "Active", detail);
  }
  if (vocabScore === null) {
    return signal("not-enough-data", null, "Getting started", detail);
  }
  if (vocabScore >= 70) return signal("strong", vocabScore, "Strong", detail);
  return signal("learning", vocabScore, "Learning", detail);
}

export function quizMasterySignal(
  snap: DatabaseSnapshot,
  quizId: string,
): MasterySignal {
  const s = quizSignals(snap).find((q) => q.quiz.id === quizId);
  if (!s || s.attempts.length === 0) {
    return signal("not-enough-data", null, "Not attempted", "Take it to see where you stand");
  }
  const history = s.scoreHistory;
  const last = history[history.length - 1];
  if (s.improving) return signal("improving", last, "Improving", trendDetail(history));
  if (s.strong) return signal("strong", last, "Strong", `Best ${s.bestScore}%`);
  return signal(
    "learning",
    history.length >= 2 ? last : last,
    "Learning",
    history.length >= 2 ? trendDetail(history) : `Scored ${last}%`,
  );
}

export function masterySignalFor(
  snap: DatabaseSnapshot,
  sourceType: LearningSourceType,
  sourceId: string,
): MasterySignal {
  switch (sourceType) {
    case "material":
      return materialMasterySignal(snap, sourceId);
    case "deck":
      return deckMasterySignal(snap, sourceId);
    case "language":
      return languageMasterySignal(snap, sourceId);
    case "quiz":
      return quizMasterySignal(snap, sourceId);
  }
}

export const MASTERY_LABEL_TEXT: Record<MasteryLabel, string> = {
  "not-enough-data": "Not enough data",
  learning: "Learning",
  improving: "Improving",
  strong: "Strong",
  active: "Active",
};
