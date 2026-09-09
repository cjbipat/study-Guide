import type { AchievementDef, AchievementId, UserStats } from "@/lib/types";
import { levelFromXp } from "@/lib/xp";

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-deck",
    title: "First Deck",
    description: "You created your first deck. The journey begins.",
    icon: "🎴",
    major: false,
  },
  {
    id: "first-session",
    title: "Warmed Up",
    description: "Completed your first study session.",
    icon: "⚡",
    major: false,
  },
  {
    id: "hundred-cards",
    title: "100 Reviews",
    description: "You've reviewed 100 cards. Momentum is real.",
    icon: "💯",
    major: false,
  },
  {
    id: "five-hundred-cards",
    title: "500 Reviews",
    description: "Five hundred reviews deep. Serious commitment.",
    icon: "🚀",
    major: true,
  },
  {
    id: "thousand-cards",
    title: "1,000 Reviews",
    description: "A thousand reviews. You're in rare company.",
    icon: "👑",
    major: true,
  },
  {
    id: "streak-7",
    title: "7 Day Streak",
    description: "You're building a habit.",
    icon: "🔥",
    major: false,
  },
  {
    id: "streak-30",
    title: "30 Day Streak",
    description: "A full month, every day. This is who you are now.",
    icon: "🏔️",
    major: true,
  },
  {
    id: "perfect-session",
    title: "Perfect Session",
    description: "Every card correct in a session of 10 or more.",
    icon: "🎯",
    major: false,
  },
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Studied after midnight. Dedication or procrastination?",
    icon: "🦉",
    major: false,
  },
  {
    id: "level-10",
    title: "Level 10",
    description: "Reached level 10. The compounding is working.",
    icon: "🌟",
    major: true,
  },
];

export const ACHIEVEMENT_MAP: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<AchievementId, AchievementDef>;

export interface AchievementContext {
  deckCount: number;
  sessionCount: number;
  lastSessionReviewed: number;
  lastSessionCorrect: number;
  studiedAfterMidnight: boolean;
}

/** Returns the ids the user now qualifies for that they haven't unlocked yet. */
export function evaluateAchievements(
  stats: UserStats,
  ctx: AchievementContext,
): AchievementId[] {
  const have = new Set(stats.unlocked.map((u) => u.id));
  const earned: AchievementId[] = [];
  const add = (id: AchievementId, cond: boolean) => {
    if (cond && !have.has(id)) earned.push(id);
  };

  add("first-deck", ctx.deckCount >= 1);
  add("first-session", ctx.sessionCount >= 1);
  add("hundred-cards", stats.totalReviews >= 100);
  add("five-hundred-cards", stats.totalReviews >= 500);
  add("thousand-cards", stats.totalReviews >= 1000);
  add("streak-7", stats.currentStreak >= 7);
  add("streak-30", stats.currentStreak >= 30);
  add(
    "perfect-session",
    ctx.lastSessionReviewed >= 10 && ctx.lastSessionCorrect === ctx.lastSessionReviewed,
  );
  add("night-owl", ctx.studiedAfterMidnight);
  add("level-10", levelFromXp(stats.totalXp).level >= 10);

  return earned;
}
