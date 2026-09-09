/**
 * Universal Quiz System — pure reducers + view-model selectors.
 * The React layer calls these through store-context.
 */

import type { DatabaseSnapshot, LearningActivity } from "@/lib/types";
import type {
  Quiz,
  QuizAnswerRecord,
  QuizAttempt,
  QuizCelebration,
  QuizQuestion,
  QuizResultView,
  QuizSource,
  QuizWithMeta,
  TopicResult,
} from "@/lib/quiz/types";
import {
  crossedMilestone,
  materialMastery,
  type Milestone,
} from "@/lib/materials/progress";
import { touchStudyDay } from "@/lib/store";
import {
  attemptsForQuiz,
  bestScoreForQuiz,
  latestAttemptForQuiz,
} from "@/lib/quiz/selectors";
import { uid } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Answer checking (deterministic, honest)                            */
/* ------------------------------------------------------------------ */

export function normalizeText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?"'“”‘’()\[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

/** Case-insensitive deterministic check. Never an AI guess. */
export function checkAnswer(question: QuizQuestion, given: string): boolean {
  switch (question.type) {
    case "multiple-choice":
    case "true-false":
      return normalizeText(given) === normalizeText(question.answer ?? "");
    case "short-answer":
    case "fill-blank": {
      const g = normalizeText(given);
      return (question.acceptedAnswers ?? []).some((a) => {
        const n = normalizeText(a);
        return g === n || (n.length > 6 && (g.includes(n) || n.includes(g)));
      });
    }
    case "matching":
      // given is JSON: { [left]: chosenRight }
      try {
        const map = JSON.parse(given) as Record<string, string>;
        return (question.pairs ?? []).every(
          (p) => normalizeText(map[p.left] ?? "") === normalizeText(p.right),
        );
      } catch {
        return false;
      }
  }
}

/* ------------------------------------------------------------------ */
/*  Create / edit                                                      */
/* ------------------------------------------------------------------ */

export interface CreateQuizInput {
  title: string;
  source: QuizSource;
  questions: QuizQuestion[];
  status?: "draft" | "ready";
  recipe?: Quiz["recipe"];
}

export function createQuiz(
  snap: DatabaseSnapshot,
  input: CreateQuizInput,
): { snapshot: DatabaseSnapshot; quiz: Quiz } {
  const quiz: Quiz = {
    id: uid("quiz"),
    title: input.title.trim() || "Untitled quiz",
    source: input.source,
    questions: input.questions,
    createdAt: new Date().toISOString(),
    status: input.status ?? (input.questions.length ? "ready" : "draft"),
    recipe: input.recipe,
  };
  return {
    snapshot: { ...snap, quizzes: [...snap.quizzes, quiz] },
    quiz,
  };
}

export function updateQuiz(
  snap: DatabaseSnapshot,
  quizId: string,
  patch: Partial<Pick<Quiz, "title" | "questions" | "status">>,
): DatabaseSnapshot {
  return {
    ...snap,
    quizzes: snap.quizzes.map((q) =>
      q.id === quizId ? { ...q, ...patch } : q,
    ),
  };
}

export function deleteQuiz(
  snap: DatabaseSnapshot,
  quizId: string,
): DatabaseSnapshot {
  return {
    ...snap,
    quizzes: snap.quizzes.filter((q) => q.id !== quizId),
    quizAttempts: snap.quizAttempts.filter((a) => a.quizId !== quizId),
  };
}

/* ------------------------------------------------------------------ */
/*  Attempts                                                           */
/* ------------------------------------------------------------------ */

export interface FinishQuizArgs {
  quizId: string;
  startedAt: string;
  answers: QuizAnswerRecord[];
  durationMs: number;
}

export interface FinishQuizOutcome {
  snapshot: DatabaseSnapshot;
  attempt: QuizAttempt;
  xpEarned: number;
  /** points over the previous best (null when this is the first attempt) */
  improvement: number | null;
  isPersonalBest: boolean;
  isFirstEver: boolean;
  materialMilestone: Milestone | null;
  celebration: QuizCelebration | null;
}

export function finishQuizAttempt(
  snap: DatabaseSnapshot,
  args: FinishQuizArgs,
): FinishQuizOutcome {
  const now = new Date();
  const nowIso = now.toISOString();
  const quiz = snap.quizzes.find((q) => q.id === args.quizId);
  const total = args.answers.length;
  const correct = args.answers.filter((a) => a.correct).length;
  const score = total ? Math.round((correct / total) * 100) : 0;

  const prevBest = bestScoreForQuiz(snap, args.quizId);
  const prevAttempts = attemptsForQuiz(snap, args.quizId).length;
  const isFirstEver = snap.quizAttempts.length === 0;

  const attempt: QuizAttempt = {
    id: uid("qa"),
    quizId: args.quizId,
    startedAt: args.startedAt,
    finishedAt: nowIso,
    answers: args.answers,
    correct,
    total,
    score,
    durationMs: args.durationMs,
  };

  const xpEarned = correct * 8 + (score >= 90 ? 25 : 0) + (score === 100 ? 15 : 0);
  const stats = touchStudyDay(snap.stats, now, { xp: xpEarned, reviewed: 0, correct: 0 });

  let next: DatabaseSnapshot = {
    ...snap,
    quizAttempts: [...snap.quizAttempts, attempt],
    stats,
  };

  // Keep the Material Learning Hub in sync — a quiz attempt is real study.
  let materialMilestone: Milestone | null = null;
  if (quiz?.source.type === "material" && quiz.source.id) {
    const materialId = quiz.source.id;
    const before = materialMastery(snap, materialId).score;
    const after = materialMastery(next, materialId).score;
    materialMilestone = crossedMilestone(before, after);
    const act: Omit<LearningActivity, "id"> = {
      type: "quiz-attempt",
      materialId,
      deckId: null,
      learningItemId: null,
      at: nowIso,
      reviewed: total,
      correct,
      incorrect: total - correct,
      accuracy: score,
      xpEarned,
      masteryBefore: before,
      masteryAfter: after,
      detail: `${score}% score`,
    };
    next = { ...next, activities: [...next.activities, { id: uid("act"), ...act }] };
  } else {
    next = {
      ...next,
      activities: [
        ...next.activities,
        {
          id: uid("act"),
          type: "quiz-attempt",
          materialId: null,
          deckId: quiz?.source.type === "deck" ? quiz.source.id : null,
          at: nowIso,
          reviewed: total,
          correct,
          incorrect: total - correct,
          accuracy: score,
          xpEarned,
          detail: `${quiz?.title ?? "Quiz"} — ${score}%`,
        },
      ],
    };
  }

  const improvement = prevBest === null ? null : score - prevBest;
  const isPersonalBest = prevBest !== null && score > prevBest;

  // Fireworks — NOT every completion.
  let celebration: QuizCelebration | null = null;
  if (score === 100) celebration = { kind: "perfect" };
  else if (isFirstEver) celebration = { kind: "first-quiz" };
  else if (improvement !== null && improvement >= 15 && prevAttempts >= 1)
    celebration = { kind: "big-improvement", delta: improvement };
  else if (score >= 80) celebration = { kind: "great-score", score };

  return {
    snapshot: next,
    attempt,
    xpEarned,
    improvement,
    isPersonalBest,
    isFirstEver,
    materialMilestone,
    celebration,
  };
}

/* ------------------------------------------------------------------ */
/*  Selectors / view-models                                            */
/* ------------------------------------------------------------------ */

export function quizzesWithMeta(snap: DatabaseSnapshot): QuizWithMeta[] {
  return snap.quizzes
    .map((quiz) => {
      const attempts = attemptsForQuiz(snap, quiz.id);
      return {
        quiz,
        attemptCount: attempts.length,
        lastAttempt: attempts.length ? attempts[attempts.length - 1] : null,
        bestScore: attempts.length ? Math.max(...attempts.map((a) => a.score)) : null,
        scoreHistory: attempts.map((a) => a.score),
      };
    })
    .sort((a, b) => {
      const at = a.lastAttempt?.finishedAt ?? a.quiz.createdAt;
      const bt = b.lastAttempt?.finishedAt ?? b.quiz.createdAt;
      return Date.parse(bt) - Date.parse(at);
    });
}

export function getQuiz(snap: DatabaseSnapshot, quizId: string): Quiz | undefined {
  return snap.quizzes.find((q) => q.id === quizId);
}

export function buildResultView(
  snap: DatabaseSnapshot,
  attemptId: string,
): QuizResultView | null {
  const attempt = snap.quizAttempts.find((a) => a.id === attemptId);
  if (!attempt) return null;
  const quiz = getQuiz(snap, attempt.quizId);
  if (!quiz) return null;

  const byId = new Map(quiz.questions.map((q) => [q.id, q]));

  // real topic breakdown — only when questions actually carry topics
  const topicMap = new Map<string, TopicResult>();
  for (const ans of attempt.answers) {
    const q = byId.get(ans.questionId);
    if (!q?.topic) continue;
    const t = topicMap.get(q.topic) ?? { topic: q.topic, correct: 0, total: 0 };
    t.total += 1;
    if (ans.correct) t.correct += 1;
    topicMap.set(q.topic, t);
  }
  const topics = [...topicMap.values()].sort(
    (a, b) => a.correct / a.total - b.correct / b.total,
  );

  const missed = attempt.answers
    .filter((a) => !a.correct)
    .map((a) => ({ question: byId.get(a.questionId)!, given: a.given }))
    .filter((m) => m.question);

  const priorBest = bestScoreForQuiz(
    { ...snap, quizAttempts: snap.quizAttempts.filter((a) => a.id !== attemptId) },
    quiz.id,
  );

  return {
    attempt,
    quiz,
    topics: topics.length >= 1 ? topics : [],
    missed,
    improvement: priorBest === null ? null : attempt.score - priorBest,
    isPersonalBest: priorBest !== null && attempt.score > priorBest,
  };
}

export { attemptsForQuiz, latestAttemptForQuiz, bestScoreForQuiz };
