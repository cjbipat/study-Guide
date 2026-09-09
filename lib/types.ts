/**
 * Core data models for the learning platform.
 *
 * These are intentionally framework-agnostic and mirror a relational schema so
 * the mock store can be swapped for Supabase later with minimal churn:
 *   users, decks, cards, reviews, study_sessions, achievements, user_stats
 */

export type ISODateString = string;

export type DeckTheme =
  | "violet"
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "cyan"
  | "slate";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: DeckTheme;
  createdAt: ISODateString;
}

export interface Deck {
  id: string;
  userId: string;
  name: string;
  description: string;
  theme: DeckTheme;
  icon: string; // emoji
  createdAt: ISODateString;
  lastStudiedAt: ISODateString | null;
}

export interface Card {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  tags: string[];
  imageUrl?: string;
  audioUrl?: string;
  createdAt: ISODateString;
  /** Study material this card was created from, if any. */
  sourceMaterialId?: string | null;

  // Spaced-repetition scheduling state (SM-2 inspired)
  ease: number; // ease factor, starts 2.5
  intervalDays: number; // current interval
  repetitions: number; // consecutive correct answers
  dueAt: ISODateString; // next time this card should be seen
  lastReviewedAt: ISODateString | null;
  lapses: number; // times answered "again"
}

/* ------------------------------------------------------------------ */
/*  Study materials — uploaded source content                          */
/* ------------------------------------------------------------------ */

export type MaterialKind = "pdf" | "image" | "text" | "markdown" | "csv" | "other";
export type MaterialFileStatus = "processing" | "ready";

export interface StudyMaterial {
  id: string;
  /** Optional deck association — materials also live in the global library. */
  deckId: string | null;
  name: string;
  mime: string;
  kind: MaterialKind;
  size: number; // bytes of the original file
  dataUrl: string; // base64 data URL
  addedAt: ISODateString;
  status: MaterialFileStatus;
  /**
   * Plain text pulled from the file. Present for text / markdown / csv (a real
   * decode — no analysis claimed). `null` for PDFs and images, which need an
   * extraction step that isn't wired up yet.
   */
  extractedText: string | null;
  textTruncated: boolean;
}

export type LearningItemType = "flashcards" | "quiz" | "study-guide" | "summary";

/** How the content was produced — never claim automated analysis that didn't happen. */
export type GenerationSource = "manual" | "extracted";

export interface GenerationConfig {
  count?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  focus?: "concepts" | "definitions" | "facts" | "everything";
}

export type QuizQuestionType = "multiple-choice" | "true-false" | "short-answer";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options?: string[];
  answer: string;
  explanation?: string;
}

export interface StudyGuideSection {
  heading: string;
  points: string[];
}

export interface SummaryContent {
  overview: string;
  keyPoints: string[];
  keyTerms: { term: string; definition: string }[];
}

export interface LearningItem {
  id: string;
  type: LearningItemType;
  materialId: string;
  deckId: string | null;
  title: string;
  createdAt: ISODateString;
  config: GenerationConfig;
  source: GenerationSource;
  /** flashcards → ids of the Cards created */
  cardIds?: string[];
  questions?: QuizQuestion[];
  sections?: StudyGuideSection[];
  summary?: SummaryContent;
  /** last quiz attempt */
  lastScore?: { correct: number; total: number; takenAt: ISODateString } | null;
}

/* ------------------------------------------------------------------ */
/*  Learning activity + progress (the "Learning Hub" layer)           */
/* ------------------------------------------------------------------ */

export type LearningActivityType =
  | "material-added"
  | "flashcards-created"
  | "quiz-created"
  | "guide-created"
  | "summary-created"
  | "flashcard-session"
  | "quiz-attempt";

/** One durable record of something the user did. The single source of history. */
export interface LearningActivity {
  id: string;
  type: LearningActivityType;
  materialId: string | null;
  deckId: string | null;
  sessionId?: string | null;
  learningItemId?: string | null;
  at: ISODateString;
  // metrics — present for study sessions and quiz attempts
  reviewed?: number;
  correct?: number;
  incorrect?: number;
  accuracy?: number; // 0..100
  xpEarned?: number;
  masteryBefore?: number | null;
  masteryAfter?: number | null;
  /** short human label, e.g. "6 Flashcards" or "87% Score" */
  detail?: string;
}

export type MaterialGoalType = "date" | "review-all" | "quiz-80" | "master-100";

export interface MaterialGoal {
  materialId: string;
  type: MaterialGoalType;
  targetDate?: string | null; // yyyy-mm-dd, only for type "date"
  createdAt: ISODateString;
  completedAt?: ISODateString | null;
}

export type MaterialStatus = "new" | "learning" | "reviewing" | "mastered";

/** Computed — never persisted. All values come from real activity. */
export interface MaterialMastery {
  /** 0..100, or null when there isn't enough activity to score */
  score: number | null;
  cardsTotal: number;
  cardsMastered: number;
  bestQuizScore: number | null;
  sessionCount: number;
  hasActivity: boolean;
  /** flashcards still worth reviewing to raise the score */
  toImprove: number;
}

export interface MaterialProgress extends MaterialMastery {
  status: MaterialStatus;
  lastStudiedAt: ISODateString | null;
  dueCount: number;
  topics: string[];
  goal: MaterialGoal | null;
}

export type RecommendationKind =
  | "create-flashcards"
  | "manual-flashcards"
  | "start-flashcards"
  | "review-due"
  | "continue-session"
  | "take-quiz"
  | "create-quiz"
  | "review-weak"
  | "review-again"
  | "open-material";

export interface StudyRecommendation {
  kind: RecommendationKind;
  label: string;
  reason: string;
  href: string;
  tone: "primary" | "accent" | "success";
}

export interface Review {
  id: string;
  cardId: string;
  deckId: string;
  sessionId: string;
  rating: ReviewRating;
  correct: boolean;
  xpEarned: number;
  responseMs: number;
  reviewedAt: ISODateString;
}

export interface StudySession {
  id: string;
  deckId: string;
  startedAt: ISODateString;
  endedAt: ISODateString | null;
  cardsReviewed: number;
  cardsCorrect: number;
  xpEarned: number;
}

export type AchievementId =
  | "first-deck"
  | "first-session"
  | "hundred-cards"
  | "five-hundred-cards"
  | "thousand-cards"
  | "streak-7"
  | "streak-30"
  | "perfect-session"
  | "night-owl"
  | "level-10";

export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  /** milestone achievements fire the big celebration */
  major: boolean;
}

export interface UnlockedAchievement {
  id: AchievementId;
  unlockedAt: ISODateString;
}

export interface DailyStat {
  date: string; // yyyy-mm-dd
  reviewed: number;
  correct: number;
  xp: number;
}

export interface UserStats {
  userId: string;
  totalXp: number;
  totalReviews: number;
  totalCorrect: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null; // yyyy-mm-dd
  daily: DailyStat[];
  unlocked: UnlockedAchievement[];
}

/** Shape persisted to storage / to be persisted to Supabase tables. */
export interface DatabaseSnapshot {
  version: number;
  user: User;
  decks: Deck[];
  cards: Card[];
  materials: StudyMaterial[];
  learningItems: LearningItem[];
  activities: LearningActivity[];
  goals: MaterialGoal[];
  reviews: Review[];
  sessions: StudySession[];
  stats: UserStats;

  // Language Learning Mode
  languages: import("@/lib/language/types").LanguageProfile[];
  vocab: import("@/lib/language/types").LanguageVocabularyItem[];
  languageReviews: import("@/lib/language/types").LanguageReview[];
  languageSessions: import("@/lib/language/types").LanguageSession[];
  languageActivities: import("@/lib/language/types").LanguageActivity[];
  pronunciationAttempts: import("@/lib/language/types").PronunciationAttempt[];
  languageGoals: import("@/lib/language/types").LanguageGoal[];
  conversationSessions: import("@/lib/language/conversation-types").ConversationSession[];

  // Universal Quiz System
  quizzes: import("@/lib/quiz/types").Quiz[];
  quizAttempts: import("@/lib/quiz/types").QuizAttempt[];
}

/* ------------------------------------------------------------------ */
/*  Derived / view-model helpers                                       */
/* ------------------------------------------------------------------ */

export interface DeckWithMeta extends Deck {
  cardCount: number;
  dueCount: number;
  newCount: number;
  mastery: number; // 0..100
  materialCount: number;
  quizCount: number;
  guideCount: number;
}

export interface MaterialWithMeta extends StudyMaterial {
  deckName: string | null;
  flashcardCount: number;
  quizCount: number;
  guideCount: number;
  summaryCount: number;
  learningItemCount: number;
  mastery: number | null;
  masteryStatus: MaterialStatus;
  lastStudiedAt: ISODateString | null;
}
