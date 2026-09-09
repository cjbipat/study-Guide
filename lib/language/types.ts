/**
 * Language Learning Mode — data models.
 *
 * Sits alongside the Study workspace, never replacing it. Modelled like
 * relational tables so a Supabase move is mechanical.
 */

import type { ISODateString } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Catalog                                                            */
/* ------------------------------------------------------------------ */

export interface Language {
  id: string; // e.g. "mandarin"
  name: string; // "Mandarin Chinese"
  nativeName: string; // "中文"
  flag: string; // emoji
  /** BCP-47 tag for the Web Speech / audio provider, e.g. "zh-CN" */
  speechLang: string;
  /** logographic script that benefits from a dedicated character mode */
  characterBased: boolean;
  /** has a romanisation layer (pinyin, romaji, …) worth toggling */
  romanization: "pinyin" | "romaji" | "romaja" | null;
  /** tonal language → tone practice is offered */
  tonal: boolean;
}

/* ------------------------------------------------------------------ */
/*  Per-user language profile                                          */
/* ------------------------------------------------------------------ */

export type LanguageLevel =
  | "complete-beginner"
  | "beginner"
  | "intermediate"
  | "advanced";

export type LanguageGoalKind =
  | "travel"
  | "conversation"
  | "school"
  | "career"
  | "family"
  | "fluency"
  | "custom";

export type RomanizationMode = "always" | "tap" | "hidden";

export interface LanguageProfile {
  id: string; // profile id
  userId: string;
  languageId: string;
  level: LanguageLevel;
  goal: LanguageGoalKind;
  customGoal?: string | null;
  dailyMinutes: number; // 5 | 10 | 15 | 30 | 60
  romanizationMode: RomanizationMode;
  createdAt: ISODateString;
  streak: number;
  longestStreak: number;
  lastSessionDate: string | null; // yyyy-mm-dd
  xp: number;
}

/* ------------------------------------------------------------------ */
/*  Vocabulary                                                         */
/* ------------------------------------------------------------------ */

export type VocabPartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "phrase"
  | "particle"
  | "pronoun"
  | "number"
  | "other";

export type VocabState = "new" | "learning" | "review" | "mastered";

export interface LanguageVocabularyItem {
  id: string;
  profileId: string;
  languageId: string;
  target: string; // 你好  /  hola
  translation: string; // Hello
  pronunciation: string; // nǐ hǎo  (pinyin / romaji / IPA-ish)
  partOfSpeech: VocabPartOfSpeech;
  exampleSentence?: string;
  exampleTranslation?: string;
  examplePronunciation?: string;
  imageUrl?: string | null;
  tags: string[];
  difficulty: 1 | 2 | 3;
  custom: boolean; // user-added vs seeded
  createdAt: ISODateString;

  // spaced-review scheduling state (owned by LanguageReviewScheduler)
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: ISODateString;
  lastReviewedAt: ISODateString | null;
  lapses: number;
}

/* ------------------------------------------------------------------ */
/*  Exercises / lessons                                                */
/* ------------------------------------------------------------------ */

export type RecallDirection =
  | "translation-to-target" // "How do you say 'hello'?"
  | "target-to-translation" // "What does 你好 mean?"
  | "audio-to-target" // "What did you hear?"
  | "image-to-target"; // recall the word from a picture

export type LanguageSkill =
  | "vocabulary"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "pronunciation";

export type PracticeMode =
  | "learn"
  | "review"
  | "listening"
  | "speaking"
  | "shadowing"
  | "reading"
  | "writing"
  | "characters"
  | "tones"
  | "conversation";

export interface ReadingPassage {
  id: string;
  languageId: string;
  level: LanguageLevel;
  title: string;
  target: string; // the passage in the target language
  translation: string;
  /** word-by-word glossary keyed by the surface form */
  glossary: { word: string; pronunciation: string; meaning: string }[];
  comprehension?: { prompt: string; options: string[]; answer: string };
}

export interface ShadowingLine {
  id: string;
  languageId: string;
  level: LanguageLevel;
  target: string;
  pronunciation: string;
  translation: string;
}

/* ------------------------------------------------------------------ */
/*  Activity / history                                                 */
/* ------------------------------------------------------------------ */

export interface LanguageReview {
  id: string;
  profileId: string;
  vocabId: string | null;
  skill: LanguageSkill;
  mode: PracticeMode;
  direction?: RecallDirection;
  correct: boolean;
  responseMs: number;
  xpEarned: number;
  at: ISODateString;
}

export interface PronunciationAttempt {
  id: string;
  profileId: string;
  vocabId: string | null;
  lineId: string | null;
  /** always null — no evaluator is connected. Kept for the future seam. */
  score: number | null;
  durationMs: number;
  at: ISODateString;
}

export type LanguageActivityType =
  | "language-added"
  | "session-completed"
  | "vocab-added"
  | "level-completed"
  | "challenge-completed"
  | "conversation-completed"
  | "milestone";

export interface LanguageActivity {
  id: string;
  profileId: string;
  languageId: string;
  type: LanguageActivityType;
  at: ISODateString;
  detail?: string;
  xpEarned?: number;
  // session metrics
  reviewed?: number;
  correct?: number;
  accuracy?: number;
  skills?: LanguageSkill[];
}

export interface LanguageSession {
  id: string;
  profileId: string;
  startedAt: ISODateString;
  endedAt: ISODateString | null;
  blocks: PracticeMode[];
  reviewed: number;
  correct: number;
  xpEarned: number;
}

export type LanguageGoalTargetKind =
  | "daily-streak"
  | "words-learned"
  | "skill-target"
  | "date";

export interface LanguageGoal {
  profileId: string;
  kind: LanguageGoalTargetKind;
  skill?: LanguageSkill;
  targetValue?: number;
  targetDate?: string | null;
  createdAt: ISODateString;
  completedAt?: ISODateString | null;
}

/* ------------------------------------------------------------------ */
/*  Computed view-models                                               */
/* ------------------------------------------------------------------ */

export interface SkillProgress {
  skill: LanguageSkill;
  /** 0..100, or null when there isn't enough activity to score honestly */
  score: number | null;
  attempts: number;
  hint: string;
}

export interface LanguageProgress {
  profileId: string;
  languageId: string;
  skills: Record<LanguageSkill, SkillProgress>;
  vocabTotal: number;
  vocabByState: Record<VocabState, number>;
  dueCount: number;
  newCount: number;
  overall: number | null;
  streak: number;
}

export interface SessionBlock {
  mode: PracticeMode;
  skill: LanguageSkill;
  label: string;
  minutes: number;
  itemCount: number;
}

export interface TodaySessionPlan {
  blocks: SessionBlock[];
  totalMinutes: number;
  dueVocab: number;
  newVocab: number;
  listeningItems: number;
  speakingItems: number;
  challengeItems: number;
}

export interface LanguageRecommendation {
  kind:
    | "start-session"
    | "focus-listening"
    | "focus-speaking"
    | "focus-reading"
    | "practice-tones"
    | "practice-conversation"
    | "travel-conversation"
    | "welcome-back"
    | "learn-vocab"
    | "review-vocab";
  title: string;
  body: string;
  cta: string;
  href: string;
  skill?: LanguageSkill;
}
