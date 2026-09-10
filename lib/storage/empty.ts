/**
 * A pristine, empty learning workspace.
 *
 * This is what every new user starts with: no materials, no decks, no cards, no
 * quizzes, no languages, no activity, 0 XP, 0-day streak, no achievements.
 * Real progress is built entirely from the user's own actions.
 */

import type { DatabaseSnapshot, User, UserStats } from "@/lib/types";
import { SCHEMA_VERSION } from "@/lib/storage/types";
import { uid } from "@/lib/utils";

export interface EmptyWorkspaceOptions {
  /** Display name for the greeting. Falls back to "there". */
  name?: string;
  /** Stable id for the local user. Generated if omitted. */
  userId?: string;
}

export function emptyUser(opts: EmptyWorkspaceOptions = {}): User {
  return {
    id: opts.userId ?? uid("user"),
    name: opts.name?.trim() || "there",
    email: "",
    avatarColor: "violet",
    createdAt: new Date().toISOString(),
  };
}

export function emptyStats(userId: string): UserStats {
  return {
    userId,
    totalXp: 0,
    totalReviews: 0,
    totalCorrect: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    daily: [],
    unlocked: [],
  };
}

export function emptySnapshot(opts: EmptyWorkspaceOptions = {}): DatabaseSnapshot {
  const user = emptyUser(opts);
  return {
    version: SCHEMA_VERSION,
    user,
    decks: [],
    cards: [],
    materials: [],
    learningItems: [],
    activities: [],
    goals: [],
    reviews: [],
    sessions: [],
    stats: emptyStats(user.id),

    languages: [],
    vocab: [],
    languageReviews: [],
    languageSessions: [],
    languageActivities: [],
    pronunciationAttempts: [],
    languageGoals: [],
    conversationSessions: [],

    quizzes: [],
    quizAttempts: [],
  };
}

/** True when the workspace has no learning content of any kind. */
export function isEmptyWorkspace(snap: DatabaseSnapshot): boolean {
  return (
    snap.materials.length === 0 &&
    snap.decks.length === 0 &&
    snap.cards.length === 0 &&
    snap.quizzes.length === 0 &&
    snap.languages.length === 0
  );
}
