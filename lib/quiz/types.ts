/**
 * Universal Quiz System — one engine, any source.
 *
 *   SOURCE  →  STUDY  →  QUIZ  →  IDENTIFY WEAKNESSES  →  REVIEW  →  RETAKE  →  MASTER
 *
 * A quiz never knows or cares how its questions were made. `QuizGenerator`
 * delegates by `QuizSource.type`; every generator emits the same `QuizQuestion`
 * shape, and one `QuizPlayer` runs all of them.
 */

import type { ISODateString } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Source                                                             */
/* ------------------------------------------------------------------ */

export type QuizSourceType = "material" | "deck" | "language" | "manual";

/** For language quizzes — which slice of the language content. */
export type QuizLanguageMode =
  | "vocabulary"
  | "listening"
  | "sentence"
  | "reading"
  | "conversation";

export interface QuizSource {
  type: QuizSourceType;
  /** materialId | deckId | languageProfileId | null (manual) */
  id: string | null;
  /** display name, e.g. "Biology Chapter 4" */
  label: string;
  /** emoji shown on cards */
  icon: string;
  /** language quizzes: the content slice */
  languageMode?: QuizLanguageMode;
}

/* ------------------------------------------------------------------ */
/*  Questions                                                          */
/* ------------------------------------------------------------------ */

export type QuizQuestionType =
  | "multiple-choice"
  | "true-false"
  | "short-answer"
  | "fill-blank"
  | "matching";

export const QUESTION_TYPE_LABEL: Record<QuizQuestionType, string> = {
  "multiple-choice": "Multiple Choice",
  "true-false": "True / False",
  "short-answer": "Short Answer",
  "fill-blank": "Fill in the Blank",
  matching: "Matching",
};

export interface MatchingPair {
  left: string;
  right: string;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  /** the question text. For fill-blank, contains a `____` marker. */
  prompt: string;
  /** multiple-choice: the answer options */
  options?: string[];
  /** multiple-choice: the correct option · true-false: "True" | "False" */
  answer?: string;
  /** short-answer / fill-blank: every accepted answer (case-insensitive) */
  acceptedAnswers?: string[];
  /** matching: the pairs to connect */
  pairs?: MatchingPair[];
  /** shown after answering — ONLY when real explanation data exists */
  explanation?: string;
  /** honest topic tag — set only when real topic metadata exists */
  topic?: string;
  /**
   * Link back to the exact thing this question tests, so the review screen can
   * offer "review this card" / "practice this word". Never guessed.
   */
  ref?: { kind: "card" | "vocab" | "scenario"; id: string };
}

/* ------------------------------------------------------------------ */
/*  Quiz + attempts                                                    */
/* ------------------------------------------------------------------ */

export type QuizStatus = "draft" | "ready";

export interface QuizRecipe {
  size: number;
  types: QuizQuestionType[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  focus?: "concepts" | "definitions" | "facts" | "everything";
  languageMode?: QuizLanguageMode;
}

export interface Quiz {
  id: string;
  title: string;
  source: QuizSource;
  questions: QuizQuestion[];
  createdAt: ISODateString;
  status: QuizStatus;
  /** generated quizzes keep their recipe so a retake can build a fresh version */
  recipe?: QuizRecipe;
}

export interface QuizAnswerRecord {
  questionId: string;
  type: QuizQuestionType;
  correct: boolean;
  /** what the learner entered / selected, for the review screen */
  given: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  startedAt: ISODateString;
  finishedAt: ISODateString;
  answers: QuizAnswerRecord[];
  correct: number;
  total: number;
  /** 0..100 */
  score: number;
  durationMs: number;
}

/* ------------------------------------------------------------------ */
/*  Computed view-models                                               */
/* ------------------------------------------------------------------ */

export interface QuizWithMeta {
  quiz: Quiz;
  attemptCount: number;
  lastAttempt: QuizAttempt | null;
  bestScore: number | null;
  /** score deltas across attempts, oldest → newest (>= 2 attempts) */
  scoreHistory: number[];
}

export interface TopicResult {
  topic: string;
  correct: number;
  total: number;
}

export interface QuizResultView {
  attempt: QuizAttempt;
  quiz: Quiz;
  /** real per-topic breakdown, or [] when no reliable topic metadata exists */
  topics: TopicResult[];
  missed: { question: QuizQuestion; given: string }[];
  /** points improvement over the previous best (null when < 2 attempts) */
  improvement: number | null;
  isPersonalBest: boolean;
}

/* ------------------------------------------------------------------ */
/*  Generation results                                                 */
/* ------------------------------------------------------------------ */

export type QuizGenerationResult =
  | { ok: true; questions: QuizQuestion[]; note?: string }
  | {
      ok: false;
      /** why we can't honestly build a quiz from this source right now */
      reason: "no-text" | "not-enough-content";
      message: string;
    };

/* ------------------------------------------------------------------ */
/*  Fireworks                                                          */
/* ------------------------------------------------------------------ */

export type QuizCelebration =
  | { kind: "first-quiz" }
  | { kind: "great-score"; score: number }
  | { kind: "perfect" }
  | { kind: "big-improvement"; delta: number };
