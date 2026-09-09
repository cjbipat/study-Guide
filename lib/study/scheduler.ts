import type { Card, ReviewRating } from "@/lib/types";

/**
 * SM-2 inspired spaced-repetition scheduler.
 *
 * Ratings map to quality:
 *   again -> lapse, reset interval, drop ease
 *   hard  -> correct but shaky, small interval, drop ease slightly
 *   good  -> standard progression
 *   easy  -> accelerated progression, bump ease
 */

const MIN_EASE = 1.3;
const DAY_MS = 86_400_000;

export interface ScheduleResult {
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
  lapses: number;
  correct: boolean;
}

export function schedule(card: Card, rating: ReviewRating, now = new Date()): ScheduleResult {
  let { ease, intervalDays, repetitions, lapses } = card;

  const correct = rating !== "again";

  switch (rating) {
    case "again": {
      repetitions = 0;
      lapses += 1;
      ease = Math.max(MIN_EASE, ease - 0.2);
      intervalDays = 0; // relearn: show again this session / ~10 min, treated as same day
      break;
    }
    case "hard": {
      repetitions += 1;
      ease = Math.max(MIN_EASE, ease - 0.15);
      intervalDays = repetitions <= 1 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
      break;
    }
    case "good": {
      repetitions += 1;
      if (repetitions === 1) intervalDays = 1;
      else if (repetitions === 2) intervalDays = 3;
      else intervalDays = Math.round(intervalDays * ease);
      break;
    }
    case "easy": {
      repetitions += 1;
      ease = ease + 0.15;
      if (repetitions === 1) intervalDays = 2;
      else if (repetitions === 2) intervalDays = 5;
      else intervalDays = Math.round(intervalDays * ease * 1.3);
      break;
    }
  }

  intervalDays = Math.min(intervalDays, 365);

  const dueAt = new Date(
    now.getTime() + Math.max(rating === "again" ? DAY_MS * 0 + 6 * 60_000 : DAY_MS, intervalDays * DAY_MS),
  );
  // For "again" we want it due basically now (within-session requeue handled by session).
  if (rating === "again") dueAt.setTime(now.getTime() + 6 * 60_000);

  return {
    ease: Number(ease.toFixed(2)),
    intervalDays,
    repetitions,
    lapses,
    dueAt: dueAt.toISOString(),
    correct,
  };
}

/** Human-friendly "next review" label for the response buttons. */
export function previewInterval(card: Card, rating: ReviewRating): string {
  if (rating === "again") return "<10m";
  const r = schedule(card, rating);
  const d = r.intervalDays;
  if (d < 1) return "<1d";
  if (d === 1) return "1d";
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${(d / 365).toFixed(1)}y`;
}

export function isDue(card: Card, now = new Date()): boolean {
  return new Date(card.dueAt).getTime() <= now.getTime();
}

export function isNew(card: Card): boolean {
  return card.repetitions === 0 && card.lastReviewedAt === null;
}

/**
 * Mastery for a card: 0 for brand new, scaling with how far it has been pushed
 * out on the schedule and its ease. 21+ day interval with healthy ease = mastered.
 */
export function cardMastery(card: Card): number {
  if (isNew(card)) return 0;
  const intervalScore = Math.min(1, card.intervalDays / 21);
  const easeScore = Math.min(1, Math.max(0, (card.ease - MIN_EASE) / (2.7 - MIN_EASE)));
  const lapsePenalty = Math.min(0.35, card.lapses * 0.08);
  return Math.round(Math.max(0, Math.min(1, intervalScore * 0.7 + easeScore * 0.3 - lapsePenalty)) * 100);
}

export function deckMastery(cards: Card[]): number {
  if (cards.length === 0) return 0;
  const sum = cards.reduce((acc, c) => acc + cardMastery(c), 0);
  return Math.round(sum / cards.length);
}
