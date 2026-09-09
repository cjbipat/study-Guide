/**
 * Leaf selectors for the Learning Hub.
 *
 * Pure reads over `DatabaseSnapshot` plus small time-estimate helpers. This
 * module only imports existing leaf utilities (schedulers, quiz selectors,
 * catalog) so every other `lib/learning/*` module can import it freely without
 * risking an import cycle.
 *
 * Nothing here fabricates data — a selector that can't find real evidence
 * returns an empty list or `null`.
 */

import type { DatabaseSnapshot, Card } from "@/lib/types";
import type { Quiz, QuizAttempt } from "@/lib/quiz/types";
import type { LanguageVocabularyItem } from "@/lib/language/types";
import { isDue as cardIsDue, isNew as cardIsNew } from "@/lib/study/scheduler";
import { getScheduler } from "@/lib/language/scheduler";
import { attemptsForQuiz } from "@/lib/quiz/selectors";
import { getLanguage } from "@/lib/language/catalog";

/* ------------------------------------------------------------------ */
/*  Time estimates — one place, so plans and recommendations agree     */
/* ------------------------------------------------------------------ */

export const MINUTES_PER_FLASHCARD = 0.25;
export const MINUTES_PER_VOCAB = 0.3;
export const MINUTES_PER_QUIZ_QUESTION = 1;

export function estFlashcardMinutes(count: number): number {
  return Math.max(1, Math.round(count * MINUTES_PER_FLASHCARD));
}
export function estVocabMinutes(count: number): number {
  return Math.max(1, Math.round(count * MINUTES_PER_VOCAB));
}
export function estQuizMinutes(questionCount: number): number {
  return Math.max(3, Math.round(questionCount * MINUTES_PER_QUIZ_QUESTION));
}

/* ------------------------------------------------------------------ */
/*  Flashcard / deck signals                                           */
/* ------------------------------------------------------------------ */

export interface DeckSignal {
  deckId: string;
  name: string;
  icon: string;
  cardCount: number;
  dueCount: number;
  newCount: number;
  /** cards answered "again"/"hard" often, or with real lapses */
  shakyCards: Card[];
  reviewedCount: number;
  lastStudiedAt: string | null;
}

export function deckSignals(snap: DatabaseSnapshot, now = new Date()): DeckSignal[] {
  return snap.decks.map((deck) => {
    const cards = snap.cards.filter((c) => c.deckId === deck.id);
    const seen = cards.filter((c) => !cardIsNew(c));
    const due = seen.filter((c) => cardIsDue(c, now));
    const neu = cards.filter((c) => cardIsNew(c));
    const shaky = seen.filter((c) => c.lapses >= 2 || (c.repetitions <= 1 && c.lapses >= 1));
    return {
      deckId: deck.id,
      name: deck.name,
      icon: deck.icon,
      cardCount: cards.length,
      dueCount: due.length,
      newCount: neu.length,
      shakyCards: shaky,
      reviewedCount: seen.length,
      lastStudiedAt: deck.lastStudiedAt,
    };
  });
}

/** An unfinished study session (cards reviewed, never ended). */
export function openStudySession(
  snap: DatabaseSnapshot,
): { sessionId: string; deckId: string } | null {
  const s = snap.sessions.find((x) => !x.endedAt && x.cardsReviewed > 0);
  return s ? { sessionId: s.id, deckId: s.deckId } : null;
}

/* ------------------------------------------------------------------ */
/*  Language signals                                                   */
/* ------------------------------------------------------------------ */

export interface LanguageSignal {
  profileId: string;
  languageId: string;
  name: string;
  flag: string;
  streak: number;
  dueCount: number;
  newCount: number;
  vocabTotal: number;
  studiedCount: number;
  /** vocab items rated "again" repeatedly */
  slippingWords: LanguageVocabularyItem[];
  lastSessionAt: string | null;
  daysSinceSession: number | null;
}

export function languageSignals(
  snap: DatabaseSnapshot,
  now = new Date(),
): LanguageSignal[] {
  const scheduler = getScheduler();
  return snap.languages.map((profile) => {
    const lang = getLanguage(profile.languageId);
    const vocab = snap.vocab.filter((v) => v.profileId === profile.id);
    const studied = vocab.filter(
      (v) => v.repetitions > 0 || v.lastReviewedAt !== null,
    );
    let due = 0;
    let neu = 0;
    for (const v of vocab) {
      if (v.repetitions === 0 && v.lastReviewedAt === null) neu += 1;
      else if (scheduler.isDue(v, now)) due += 1;
    }
    const slipping = studied.filter((v) => v.lapses >= 2);
    const sessions = snap.languageActivities
      .filter((a) => a.profileId === profile.id && a.type === "session-completed")
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    const lastSessionAt = sessions[0]?.at ?? null;
    const daysSince = lastSessionAt
      ? Math.floor((now.getTime() - Date.parse(lastSessionAt)) / 86_400_000)
      : null;
    return {
      profileId: profile.id,
      languageId: profile.languageId,
      name: lang?.name ?? profile.languageId,
      flag: lang?.flag ?? "🌐",
      streak: profile.streak,
      dueCount: due,
      newCount: neu,
      vocabTotal: vocab.length,
      studiedCount: studied.length,
      slippingWords: slipping,
      lastSessionAt,
      daysSinceSession: daysSince,
    };
  });
}

/** An open language session (started today, never finished). */
export function openLanguageSession(
  snap: DatabaseSnapshot,
): { sessionId: string; profileId: string } | null {
  const s = snap.languageSessions.find((x) => !x.endedAt);
  return s ? { sessionId: s.id, profileId: s.profileId } : null;
}

/* ------------------------------------------------------------------ */
/*  Quiz signals                                                       */
/* ------------------------------------------------------------------ */

export interface QuizSignal {
  quiz: Quiz;
  attempts: QuizAttempt[];
  lastAttempt: QuizAttempt | null;
  prevAttempt: QuizAttempt | null;
  bestScore: number | null;
  /** oldest → newest scores */
  scoreHistory: number[];
  /** true when the recent trend is clearly upward */
  improving: boolean;
  /** true when the latest score is a repeated strong performance */
  strong: boolean;
}

export function quizSignals(snap: DatabaseSnapshot): QuizSignal[] {
  return snap.quizzes.map((quiz) => {
    const attempts = attemptsForQuiz(snap, quiz.id);
    const scoreHistory = attempts.map((a) => a.score);
    const lastAttempt = attempts[attempts.length - 1] ?? null;
    const prevAttempt = attempts[attempts.length - 2] ?? null;
    const bestScore = scoreHistory.length ? Math.max(...scoreHistory) : null;

    let improving = false;
    let strong = false;
    if (attempts.length >= 2 && lastAttempt && prevAttempt) {
      improving =
        lastAttempt.score > prevAttempt.score &&
        lastAttempt.score - scoreHistory[0] >= 10;
      strong =
        lastAttempt.score >= 80 &&
        prevAttempt.score >= 70;
    } else if (attempts.length === 1 && lastAttempt) {
      strong = lastAttempt.score >= 85;
    }

    return {
      quiz,
      attempts,
      lastAttempt,
      prevAttempt,
      bestScore,
      scoreHistory,
      improving,
      strong,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Content / activity presence                                        */
/* ------------------------------------------------------------------ */

export function hasAnyContent(snap: DatabaseSnapshot): boolean {
  return (
    snap.materials.length > 0 ||
    snap.cards.length > 0 ||
    snap.languages.length > 0 ||
    snap.quizzes.length > 0
  );
}

export function hasAnyActivity(snap: DatabaseSnapshot): boolean {
  return (
    snap.reviews.length > 0 ||
    snap.sessions.length > 0 ||
    snap.quizAttempts.length > 0 ||
    snap.languageReviews.length > 0 ||
    snap.languageSessions.length > 0 ||
    snap.activities.some(
      (a) => a.type === "flashcard-session" || a.type === "quiz-attempt",
    ) ||
    snap.languageActivities.some((a) => a.type === "session-completed")
  );
}
