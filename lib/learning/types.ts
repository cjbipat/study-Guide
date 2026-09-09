/**
 * The Universal Learning Hub — shared types.
 *
 * The Hub connects every learning system (Study Materials, Decks, Flashcards,
 * Quizzes, Languages) and answers one question: "What should I do next?"
 *
 * CORE PRINCIPLE: the Hub never pretends to be intelligent when there isn't
 * enough data. Nothing here is fabricated — every weakness, mastery label,
 * recommendation and plan step is traceable to real stored activity. When the
 * data is thin, the Hub recommends a reasonable next action instead of
 * inventing progress.
 *
 * Dependency direction is one-way: `lib/learning/*` reads from the existing
 * `lib/*` modules; nothing in `lib/*` imports back. `selectors.ts` is the leaf.
 */

/* ------------------------------------------------------------------ */
/*  Sources                                                            */
/* ------------------------------------------------------------------ */

export type LearningSourceType = "material" | "deck" | "language" | "quiz";

/** A learning area the user is actually engaged with. */
export interface LearningSource {
  type: LearningSourceType;
  id: string;
  title: string;
  icon: string;
  /** route to open this source directly */
  href: string;
}

/* ------------------------------------------------------------------ */
/*  Recommendations                                                    */
/* ------------------------------------------------------------------ */

export type RecommendationType =
  | "ReviewFlashcards"
  | "StudyMaterial"
  | "TakeQuiz"
  | "ReviewQuizMistakes"
  | "RetakeQuiz"
  | "PracticeLanguage"
  | "ContinueLanguageSession"
  | "ContinueConversation"
  | "LearnVocabulary"
  | "GetStarted";

/**
 * Every recommendation carries a real, human-readable reason tied to stored
 * data. `code` is the machine tag (for tests / analytics); `text` is shown to
 * the user verbatim.
 */
export interface RecommendationReason {
  code: string;
  text: string;
}

export interface LearningAction {
  label: string;
  /** a real route that already exists in the app */
  href: string;
}

export interface LearningRecommendation {
  id: string;
  /** higher = more important. Deterministic — see recommendations.ts */
  priority: number;
  type: RecommendationType;
  title: string;
  description: string;
  estimatedMinutes?: number;
  sourceType?: LearningSourceType;
  sourceId?: string;
  reason: RecommendationReason;
  action: LearningAction;
}

/* ------------------------------------------------------------------ */
/*  Weaknesses                                                         */
/* ------------------------------------------------------------------ */

export type WeaknessKind =
  | "quiz-topic"
  | "quiz-questions"
  | "flashcards"
  | "language-skill"
  | "language-vocab";

export interface LearningWeakness {
  id: string;
  kind: WeaknessKind;
  sourceType: LearningSourceType;
  sourceId: string;
  /** what the weakness is about, e.g. "Cell Structure" or "Listening" */
  title: string;
  /** the real evidence, shown to the user, e.g.
   *  "You missed 3 questions about this topic in your last quiz." */
  evidence: string;
  /** 0..100 — ordering only, never displayed as a score */
  severity: number;
  estimatedMinutes: number;
  action: LearningAction;
}

/* ------------------------------------------------------------------ */
/*  Mastery                                                            */
/* ------------------------------------------------------------------ */

/**
 * Honest mastery labels. A precise percentage is only ever shown when it isn't
 * misleading — otherwise the label stands alone.
 *
 * - not-enough-data — studied but not tested, or no measurable activity
 * - learning        — started, limited evidence
 * - improving       — measured trend is upward
 * - strong          — repeated successful performance
 * - active          — a language area with a live streak / recent sessions
 */
export type MasteryLabel =
  | "not-enough-data"
  | "learning"
  | "improving"
  | "strong"
  | "active";

export interface MasterySignal {
  label: MasteryLabel;
  /** shown ONLY when it would not mislead (>= 2 quiz attempts, etc.) */
  score: number | null;
  /** short headline, e.g. "Improving", "Not tested yet" */
  headline: string;
  /** supporting detail, e.g. "Last quiz 83% · ↑ 33% from your first attempt" */
  detail: string;
}

/* ------------------------------------------------------------------ */
/*  Due reviews / in-progress                                          */
/* ------------------------------------------------------------------ */

export interface DueReview {
  sourceType: "deck" | "language";
  sourceId: string;
  label: string;
  count: number;
  estimatedMinutes: number;
  action: LearningAction;
}

export interface InProgressItem {
  sourceType: LearningSourceType;
  sourceId: string;
  label: string;
  /** e.g. "Session in progress", "Studied but not finished" */
  detail: string;
  estimatedMinutes: number;
  action: LearningAction;
}

/* ------------------------------------------------------------------ */
/*  Per-area progress (Universal Progress view)                        */
/* ------------------------------------------------------------------ */

export interface LearningAreaProgress {
  sourceType: LearningSourceType;
  sourceId: string;
  icon: string;
  title: string;
  mastery: MasterySignal;
  /** short factual chips, e.g. ["8 words due", "12-day streak"] */
  meta: string[];
  action: LearningAction;
}

/* ------------------------------------------------------------------ */
/*  Daily plan                                                         */
/* ------------------------------------------------------------------ */

export type PlanStepKind =
  | "review-due"
  | "fix-weakness"
  | "continue"
  | "knowledge-check";

export interface DailyPlanStep {
  id: string;
  kind: PlanStepKind;
  icon: string;
  /** short verb label, e.g. "Review", "Practice", "Test" */
  title: string;
  /** what exactly, e.g. "8 flashcards due in Biology" */
  detail: string;
  /** why this step is in the plan */
  reason: string;
  estimatedMinutes: number;
  sourceType?: LearningSourceType;
  sourceId?: string;
  action: LearningAction;
}

export interface DailyPlan {
  steps: DailyPlanStep[];
  totalMinutes: number;
  availableMinutes: number;
  /** true when there is genuinely nothing to do (all caught up / no content) */
  empty: boolean;
  /** shown when empty — a reasonable next action, never fabricated progress */
  emptyReason?: string;
}

export interface SessionPlanInput {
  availableMinutes?: number;
  activeSources: LearningSource[];
  dueReviews: DueReview[];
  weaknesses: LearningWeakness[];
  inProgress: InProgressItem[];
  /** optional knowledge-check candidates (material studied, never quizzed) */
  knowledgeChecks?: LearningRecommendation[];
}

export const TIME_BUDGETS = [5, 10, 15, 30] as const;
export type TimeBudget = (typeof TIME_BUDGETS)[number];

/* ------------------------------------------------------------------ */
/*  Unified activity feed                                              */
/* ------------------------------------------------------------------ */

export type UnifiedActivityKind =
  | "material-added"
  | "material-studied"
  | "flashcards-reviewed"
  | "quiz-completed"
  | "quiz-improved"
  | "language-practiced"
  | "language-session"
  | "conversation-completed"
  | "other";

export interface UnifiedActivity {
  id: string;
  at: string;
  kind: UnifiedActivityKind;
  icon: string;
  title: string;
  detail: string;
  sourceType?: LearningSourceType;
  sourceId?: string;
}
