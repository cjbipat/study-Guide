import type { ReviewRating } from "@/lib/types";

/** XP awarded per rating. "again" still nudges forward a little so it never feels punishing. */
export const XP_BY_RATING: Record<ReviewRating, number> = {
  again: 2,
  hard: 6,
  good: 10,
  easy: 15,
};

/** Ratings that trigger the full fireworks celebration. */
export function isCelebration(rating: ReviewRating): boolean {
  return rating === "good" || rating === "easy";
}

export function celebrationCopy(rating: ReviewRating): { title: string; sub: string } {
  switch (rating) {
    case "easy":
      return { title: "Nailed it!", sub: "That one's locked in." };
    case "good":
      return { title: "Correct!", sub: "Keep the rhythm going." };
    case "hard":
      return { title: "Got there.", sub: "A tricky one — well held." };
    case "again":
      return { title: "Not quite.", sub: "You'll catch it next time." };
  }
}

/**
 * Level curve. Level N requires a growing amount of XP. Kept gentle early so new
 * users level up in their first session, steeper later.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // cumulative: ~120, 280, 490, 760, ...
  return Math.round(60 * (level - 1) * level);
}

export function levelFromXp(xp: number): {
  level: number;
  intoLevel: number;
  span: number;
  progress: number;
} {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = next - base;
  const intoLevel = xp - base;
  return { level, intoLevel, span, progress: span > 0 ? intoLevel / span : 1 };
}
