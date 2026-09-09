/**
 * Language Learning Mode — pure reducers over `DatabaseSnapshot`.
 * Mirrors the Study layer's style. UI calls these via store-context.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type {
  Language,
  LanguageActivity,
  LanguageGoal,
  LanguageGoalTargetKind,
  LanguageLevel,
  LanguageProfile,
  LanguageProgress,
  LanguageReview,
  LanguageSession,
  LanguageSkill,
  LanguageVocabularyItem,
  PracticeMode,
  RecallDirection,
  RomanizationMode,
  VocabPartOfSpeech,
} from "@/lib/language/types";
import { getLanguage } from "@/lib/language/catalog";
import { getScheduler, gradeFrom, type ReviewGrade } from "@/lib/language/scheduler";
import { LanguageContent } from "@/lib/language/services";
import {
  crossedVocabMasteryMilestone,
  getLanguageRecommendation,
  languageActivitiesForProfile,
  languageProgress,
  reviewsForProfile,
  vocabForProfile,
  type LangMilestone,
} from "@/lib/language/progress";
import { todayKey, uid } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Selectors                                                          */
/* ------------------------------------------------------------------ */

export function getLanguageProfile(
  snap: DatabaseSnapshot,
  id: string,
): LanguageProfile | undefined {
  return snap.languages.find((p) => p.id === id);
}

export interface LanguageProfileWithMeta {
  profile: LanguageProfile;
  language: Language;
  progress: LanguageProgress;
}

export function languageProfilesWithMeta(
  snap: DatabaseSnapshot,
): LanguageProfileWithMeta[] {
  return snap.languages
    .map((profile) => {
      const language = getLanguage(profile.languageId);
      if (!language) return null;
      return { profile, language, progress: languageProgress(snap, profile) };
    })
    .filter((x): x is LanguageProfileWithMeta => x !== null)
    .sort(
      (a, b) =>
        Date.parse(b.profile.lastSessionDate ?? b.profile.createdAt) -
        Date.parse(a.profile.lastSessionDate ?? a.profile.createdAt),
    );
}

export function dueVocab(
  snap: DatabaseSnapshot,
  profileId: string,
  limit = 30,
): LanguageVocabularyItem[] {
  const scheduler = getScheduler();
  const now = new Date();
  return vocabForProfile(snap, profileId)
    .filter((v) => scheduler.isDue(v, now))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .slice(0, limit);
}

export function newVocab(
  snap: DatabaseSnapshot,
  profileId: string,
  limit = 10,
): LanguageVocabularyItem[] {
  return vocabForProfile(snap, profileId)
    .filter((v) => v.repetitions === 0 && v.lastReviewedAt === null)
    .slice(0, limit);
}

export function recommendationFor(snap: DatabaseSnapshot, profileId: string) {
  const p = getLanguageProfile(snap, profileId);
  return p ? getLanguageRecommendation(snap, p) : null;
}

/* ------------------------------------------------------------------ */
/*  Activity helper                                                    */
/* ------------------------------------------------------------------ */

function appendActivity(
  snap: DatabaseSnapshot,
  a: Omit<LanguageActivity, "id" | "at"> & { at?: string },
): DatabaseSnapshot {
  return {
    ...snap,
    languageActivities: [
      ...snap.languageActivities,
      { id: uid("la"), at: a.at ?? new Date().toISOString(), ...a },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Profile lifecycle                                                  */
/* ------------------------------------------------------------------ */

export interface CreateLanguageInput {
  languageId: string;
  level: LanguageLevel;
  goal: LanguageProfile["goal"];
  customGoal?: string | null;
  dailyMinutes: number;
}

export function createLanguageProfile(
  snap: DatabaseSnapshot,
  input: CreateLanguageInput,
): { snapshot: DatabaseSnapshot; profile: LanguageProfile } {
  const language = getLanguage(input.languageId);
  const profile: LanguageProfile = {
    id: uid("lang"),
    userId: snap.user.id,
    languageId: input.languageId,
    level: input.level,
    goal: input.goal,
    customGoal: input.customGoal ?? null,
    dailyMinutes: input.dailyMinutes,
    romanizationMode: language?.romanization ? "tap" : "hidden",
    createdAt: new Date().toISOString(),
    streak: 0,
    longestStreak: 0,
    lastSessionDate: null,
    xp: 0,
  };

  const vocab = LanguageContent.seedVocab(
    profile.id,
    input.languageId,
    input.level,
  );

  let next: DatabaseSnapshot = {
    ...snap,
    languages: [...snap.languages, profile],
    vocab: [...snap.vocab, ...vocab],
  };
  next = appendActivity(next, {
    profileId: profile.id,
    languageId: input.languageId,
    type: "language-added",
    detail: `Started learning ${language?.name ?? input.languageId}`,
  });
  return { snapshot: next, profile };
}

export function deleteLanguageProfile(
  snap: DatabaseSnapshot,
  profileId: string,
): DatabaseSnapshot {
  return {
    ...snap,
    languages: snap.languages.filter((p) => p.id !== profileId),
    vocab: snap.vocab.filter((v) => v.profileId !== profileId),
    languageReviews: snap.languageReviews.filter((r) => r.profileId !== profileId),
    languageSessions: snap.languageSessions.filter(
      (s) => s.profileId !== profileId,
    ),
    languageActivities: snap.languageActivities.filter(
      (a) => a.profileId !== profileId,
    ),
    pronunciationAttempts: snap.pronunciationAttempts.filter(
      (a) => a.profileId !== profileId,
    ),
    languageGoals: snap.languageGoals.filter((g) => g.profileId !== profileId),
    conversationSessions: snap.conversationSessions.filter(
      (s) => s.profileId !== profileId,
    ),
  };
}

export function setRomanizationMode(
  snap: DatabaseSnapshot,
  profileId: string,
  mode: RomanizationMode,
): DatabaseSnapshot {
  return {
    ...snap,
    languages: snap.languages.map((p) =>
      p.id === profileId ? { ...p, romanizationMode: mode } : p,
    ),
  };
}

export function updateLanguageProfile(
  snap: DatabaseSnapshot,
  profileId: string,
  patch: Partial<
    Pick<LanguageProfile, "level" | "goal" | "customGoal" | "dailyMinutes">
  >,
): DatabaseSnapshot {
  return {
    ...snap,
    languages: snap.languages.map((p) =>
      p.id === profileId ? { ...p, ...patch } : p,
    ),
  };
}

/* ------------------------------------------------------------------ */
/*  Vocabulary                                                         */
/* ------------------------------------------------------------------ */

export interface CustomVocabInput {
  target: string;
  translation: string;
  pronunciation: string;
  partOfSpeech: VocabPartOfSpeech;
  exampleSentence?: string;
  exampleTranslation?: string;
  tags: string[];
}

export function addCustomVocab(
  snap: DatabaseSnapshot,
  profileId: string,
  input: CustomVocabInput,
): { snapshot: DatabaseSnapshot; item: LanguageVocabularyItem } {
  const profile = getLanguageProfile(snap, profileId);
  const nowIso = new Date().toISOString();
  const item: LanguageVocabularyItem = {
    id: uid("vocab"),
    profileId,
    languageId: profile?.languageId ?? "",
    target: input.target.trim(),
    translation: input.translation.trim(),
    pronunciation: input.pronunciation.trim(),
    partOfSpeech: input.partOfSpeech,
    exampleSentence: input.exampleSentence?.trim() || undefined,
    exampleTranslation: input.exampleTranslation?.trim() || undefined,
    imageUrl: null,
    tags: input.tags,
    difficulty: 2,
    custom: true,
    createdAt: nowIso,
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: nowIso,
    lastReviewedAt: null,
    lapses: 0,
  };
  const next = appendActivity(
    { ...snap, vocab: [...snap.vocab, item] },
    {
      profileId,
      languageId: item.languageId,
      type: "vocab-added",
      detail: `${item.target} — ${item.translation}`,
    },
  );
  return { snapshot: next, item };
}

export function deleteVocab(
  snap: DatabaseSnapshot,
  vocabId: string,
): DatabaseSnapshot {
  return {
    ...snap,
    vocab: snap.vocab.filter((v) => v.id !== vocabId),
    languageReviews: snap.languageReviews.filter((r) => r.vocabId !== vocabId),
  };
}

/** Promote a Study-mode flashcard (or reading word) into vocab. */
export function addVocabFromWord(
  snap: DatabaseSnapshot,
  profileId: string,
  word: { target: string; translation: string; pronunciation: string },
): { snapshot: DatabaseSnapshot; item: LanguageVocabularyItem } {
  const existing = snap.vocab.find(
    (v) => v.profileId === profileId && v.target === word.target,
  );
  if (existing) return { snapshot: snap, item: existing };
  return addCustomVocab(snap, profileId, {
    ...word,
    partOfSpeech: "other",
    tags: ["reading"],
  });
}

/* ------------------------------------------------------------------ */
/*  Reviews / practice                                                 */
/* ------------------------------------------------------------------ */

const XP_BY_SKILL: Record<LanguageSkill, number> = {
  vocabulary: 6,
  listening: 7,
  speaking: 5,
  reading: 6,
  writing: 7,
  pronunciation: 4,
};

export interface RecordReviewArgs {
  profileId: string;
  vocabId: string | null;
  skill: LanguageSkill;
  mode: PracticeMode;
  direction?: RecallDirection;
  correct: boolean;
  responseMs: number;
  /** explicit self-rating (Again/Hard/Good/Easy). When set, drives the
   *  scheduler directly instead of inferring a grade from correct + speed. */
  grade?: ReviewGrade;
}

export interface LanguageReviewOutcome {
  snapshot: DatabaseSnapshot;
  xpEarned: number;
  correct: boolean;
}

export function recordLanguageReview(
  snap: DatabaseSnapshot,
  args: RecordReviewArgs,
): LanguageReviewOutcome {
  const now = new Date();
  const nowIso = now.toISOString();
  const scheduler = getScheduler();
  const grade = args.grade ?? gradeFrom(args.correct, args.responseMs);
  const isCorrect = args.grade ? args.grade !== "again" : args.correct;
  const xpEarned =
    grade === "again"
      ? Math.round(XP_BY_SKILL[args.skill] / 3)
      : grade === "hard"
        ? Math.round(XP_BY_SKILL[args.skill] * 0.75)
        : XP_BY_SKILL[args.skill];

  let vocab = snap.vocab;
  if (args.vocabId) {
    const item = snap.vocab.find((v) => v.id === args.vocabId);
    if (item) {
      const s = scheduler.schedule(item, grade, now);
      vocab = snap.vocab.map((v) =>
        v.id === item.id
          ? {
              ...v,
              ease: s.ease,
              intervalDays: s.intervalDays,
              repetitions: s.repetitions,
              dueAt: s.dueAt,
              lapses: s.lapses,
              lastReviewedAt: nowIso,
            }
          : v,
      );
    }
  }

  const review: LanguageReview = {
    id: uid("lr"),
    profileId: args.profileId,
    vocabId: args.vocabId,
    skill: args.skill,
    mode: args.mode,
    direction: args.direction,
    correct: isCorrect,
    responseMs: args.responseMs,
    xpEarned,
    at: nowIso,
  };

  const languages = snap.languages.map((p) =>
    p.id === args.profileId ? { ...p, xp: p.xp + xpEarned } : p,
  );

  return {
    snapshot: {
      ...snap,
      vocab,
      languageReviews: [...snap.languageReviews, review],
      languages,
    },
    xpEarned,
    correct: isCorrect,
  };
}

export function recordPronunciationAttempt(
  snap: DatabaseSnapshot,
  args: {
    profileId: string;
    vocabId?: string | null;
    lineId?: string | null;
    durationMs: number;
  },
): DatabaseSnapshot {
  return {
    ...snap,
    pronunciationAttempts: [
      ...snap.pronunciationAttempts,
      {
        id: uid("pa"),
        profileId: args.profileId,
        vocabId: args.vocabId ?? null,
        lineId: args.lineId ?? null,
        score: null, // never faked
        durationMs: args.durationMs,
        at: new Date().toISOString(),
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Sessions                                                           */
/* ------------------------------------------------------------------ */

export function startLanguageSession(
  snap: DatabaseSnapshot,
  profileId: string,
  blocks: PracticeMode[],
): { snapshot: DatabaseSnapshot; session: LanguageSession } {
  const session: LanguageSession = {
    id: uid("ls"),
    profileId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    blocks,
    reviewed: 0,
    correct: 0,
    xpEarned: 0,
  };
  return {
    snapshot: { ...snap, languageSessions: [...snap.languageSessions, session] },
    session,
  };
}

export interface FinishLanguageSessionOutcome {
  snapshot: DatabaseSnapshot;
  summary: { reviewed: number; correct: number; accuracy: number; xpEarned: number };
  vocabMasteryBefore: number | null;
  vocabMasteryAfter: number | null;
  milestone: LangMilestone | null;
  streak: number;
}

export function finishLanguageSession(
  snap: DatabaseSnapshot,
  args: {
    sessionId: string;
    profileId: string;
    vocabMasteryBefore: number | null;
    startedAtMs: number;
  },
): FinishLanguageSessionOutcome {
  const nowIso = new Date().toISOString();
  const tk = todayKey();

  const sessionReviews = snap.languageReviews.filter(
    (r) => Date.parse(r.at) >= args.startedAtMs && r.profileId === args.profileId,
  );
  const reviewed = sessionReviews.length;
  const correct = sessionReviews.filter((r) => r.correct).length;
  const xpEarned = sessionReviews.reduce((a, r) => a + r.xpEarned, 0);
  const accuracy = reviewed ? Math.round((correct / reviewed) * 100) : 0;
  const skills = [...new Set(sessionReviews.map((r) => r.skill))];

  const languageSessions = snap.languageSessions.map((s) =>
    s.id === args.sessionId && !s.endedAt
      ? { ...s, endedAt: nowIso, reviewed, correct, xpEarned }
      : s,
  );

  // streak (per day)
  let streak = 0;
  const languages = snap.languages.map((p) => {
    if (p.id !== args.profileId) return p;
    let s = p.streak;
    let longest = p.longestStreak;
    if (p.lastSessionDate !== tk) {
      const last = p.lastSessionDate
        ? new Date(p.lastSessionDate + "T00:00:00")
        : null;
      const gap = last
        ? Math.round(
            (new Date(tk + "T00:00:00").getTime() - last.getTime()) / 86_400_000,
          )
        : 1;
      s = gap === 1 ? s + 1 : 1;
      longest = Math.max(longest, s);
    }
    streak = s;
    return { ...p, streak: s, longestStreak: longest, lastSessionDate: tk };
  });

  let next: DatabaseSnapshot = { ...snap, languageSessions, languages };

  const profile = getLanguageProfile(next, args.profileId)!;
  const vocabMasteryAfter =
    languageProgress(next, profile).skills.vocabulary.score;
  const vocabMilestone = crossedVocabMasteryMilestone(
    args.vocabMasteryBefore,
    vocabMasteryAfter,
  );

  let milestone: LangMilestone | null = vocabMilestone
    ? { kind: "vocab-mastery", value: vocabMilestone }
    : null;
  const streakBefore = snap.languages.find((p) => p.id === args.profileId)?.streak ?? 0;
  if (!milestone && streakBefore < 7 && streak >= 7)
    milestone = { kind: "streak", value: 7 };
  if (!milestone && streakBefore < 30 && streak >= 30)
    milestone = { kind: "streak", value: 30 };

  next = appendActivity(next, {
    profileId: args.profileId,
    languageId: profile.languageId,
    type: "session-completed",
    reviewed,
    correct,
    accuracy,
    xpEarned,
    skills,
    detail: `${profile.dailyMinutes}-minute session`,
  });

  return {
    snapshot: next,
    summary: { reviewed, correct, accuracy, xpEarned },
    vocabMasteryBefore: args.vocabMasteryBefore,
    vocabMasteryAfter,
    milestone,
    streak,
  };
}

export interface ChallengeOutcome {
  snapshot: DatabaseSnapshot;
  perfect: boolean;
  milestone: LangMilestone | null;
}

export function recordChallengeResult(
  snap: DatabaseSnapshot,
  args: {
    profileId: string;
    challengeId: string;
    title: string;
    correct: number;
    total: number;
    xp: number;
  },
): ChallengeOutcome {
  const perfect = args.total > 0 && args.correct === args.total;
  const languages = snap.languages.map((p) =>
    p.id === args.profileId ? { ...p, xp: p.xp + (perfect ? args.xp : Math.round(args.xp / 2)) } : p,
  );
  const profile = getLanguageProfile(snap, args.profileId);
  const next = appendActivity(
    { ...snap, languages },
    {
      profileId: args.profileId,
      languageId: profile?.languageId ?? "",
      type: "challenge-completed",
      detail: `${args.title} — ${args.correct}/${args.total}`,
      xpEarned: perfect ? args.xp : Math.round(args.xp / 2),
    },
  );
  return {
    snapshot: next,
    perfect,
    milestone: perfect ? { kind: "perfect-challenge" } : null,
  };
}

/* ------------------------------------------------------------------ */
/*  Goals                                                              */
/* ------------------------------------------------------------------ */

export function setLanguageGoal(
  snap: DatabaseSnapshot,
  profileId: string,
  goal: {
    kind: LanguageGoalTargetKind;
    skill?: LanguageSkill;
    targetValue?: number;
    targetDate?: string | null;
  },
): DatabaseSnapshot {
  const existing = snap.languageGoals.find((g) => g.profileId === profileId);
  const next: LanguageGoal = {
    profileId,
    kind: goal.kind,
    skill: goal.skill,
    targetValue: goal.targetValue,
    targetDate: goal.targetDate ?? null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    completedAt: null,
  };
  return {
    ...snap,
    languageGoals: [
      ...snap.languageGoals.filter((g) => g.profileId !== profileId),
      next,
    ],
  };
}

export function clearLanguageGoal(
  snap: DatabaseSnapshot,
  profileId: string,
): DatabaseSnapshot {
  return {
    ...snap,
    languageGoals: snap.languageGoals.filter((g) => g.profileId !== profileId),
  };
}

export {
  reviewsForProfile,
  vocabForProfile,
  languageProgress,
  languageActivitiesForProfile,
};
