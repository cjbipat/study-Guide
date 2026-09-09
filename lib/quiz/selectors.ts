/**
 * Pure quiz reads with no dependencies beyond types — safe to import from
 * anywhere (materials progress, recommendations) without import cycles.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type {
  Quiz,
  QuizAttempt,
  QuizSourceType,
} from "@/lib/quiz/types";

export function quizzesForSource(
  snap: DatabaseSnapshot,
  type: QuizSourceType,
  sourceId: string | null,
): Quiz[] {
  return snap.quizzes.filter(
    (q) => q.source.type === type && q.source.id === sourceId,
  );
}

export function attemptsForQuiz(
  snap: DatabaseSnapshot,
  quizId: string,
): QuizAttempt[] {
  return snap.quizAttempts
    .filter((a) => a.quizId === quizId)
    .sort((a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt));
}

export function latestAttemptForQuiz(
  snap: DatabaseSnapshot,
  quizId: string,
): QuizAttempt | null {
  const list = attemptsForQuiz(snap, quizId);
  return list.length ? list[list.length - 1] : null;
}

export function bestScoreForQuiz(
  snap: DatabaseSnapshot,
  quizId: string,
): number | null {
  const list = attemptsForQuiz(snap, quizId);
  if (!list.length) return null;
  return Math.max(...list.map((a) => a.score));
}

/** Highest score across every quiz built from this source (or null). */
export function bestQuizScoreForSource(
  snap: DatabaseSnapshot,
  type: QuizSourceType,
  sourceId: string | null,
): number | null {
  const quizIds = new Set(quizzesForSource(snap, type, sourceId).map((q) => q.id));
  if (quizIds.size === 0) return null;
  const scores = snap.quizAttempts
    .filter((a) => quizIds.has(a.quizId))
    .map((a) => a.score);
  return scores.length ? Math.max(...scores) : null;
}

/** The most recent attempt across every quiz built from this source. */
export function latestQuizAttemptForSource(
  snap: DatabaseSnapshot,
  type: QuizSourceType,
  sourceId: string | null,
): { quiz: Quiz; attempt: QuizAttempt } | null {
  const quizzes = quizzesForSource(snap, type, sourceId);
  let best: { quiz: Quiz; attempt: QuizAttempt } | null = null;
  for (const quiz of quizzes) {
    for (const attempt of snap.quizAttempts) {
      if (attempt.quizId !== quiz.id) continue;
      if (!best || Date.parse(attempt.finishedAt) > Date.parse(best.attempt.finishedAt)) {
        best = { quiz, attempt };
      }
    }
  }
  return best;
}
