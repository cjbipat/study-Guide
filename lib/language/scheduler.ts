/**
 * LanguageReviewScheduler — spaced review for vocabulary.
 *
 * A configurable SM-2 variant. UI never computes intervals; it calls
 * `schedule()` / `getScheduler()`. Swap the config or the whole class to change
 * the algorithm without touching a component.
 */

import type { LanguageVocabularyItem, VocabState } from "@/lib/language/types";
import { clamp } from "@/lib/utils";

export interface SchedulerConfig {
  minEase: number;
  startingEase: number;
  againIntervalMinutes: number;
  hardMultiplier: number;
  goodMultiplier: number;
  easyMultiplier: number;
  /** interval (days) at/above which a word is considered mastered */
  masteredIntervalDays: number;
  masteredEase: number;
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  minEase: 1.3,
  startingEase: 2.5,
  againIntervalMinutes: 8,
  hardMultiplier: 1.2,
  goodMultiplier: 1.0, // uses ease
  easyMultiplier: 1.35,
  masteredIntervalDays: 21,
  masteredEase: 2.3,
};

export type ReviewGrade = "again" | "hard" | "good" | "easy";

/** grade a binary correct/incorrect + response speed into a review grade */
export function gradeFrom(correct: boolean, responseMs: number): ReviewGrade {
  if (!correct) return "again";
  if (responseMs < 2500) return "easy";
  if (responseMs < 6000) return "good";
  return "hard";
}

export interface ScheduleResult {
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
  lapses: number;
}

const DAY = 86_400_000;

export class LanguageReviewScheduler {
  constructor(public config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG) {}

  schedule(
    item: Pick<
      LanguageVocabularyItem,
      "ease" | "intervalDays" | "repetitions" | "lapses"
    >,
    grade: ReviewGrade,
    now = new Date(),
  ): ScheduleResult {
    const c = this.config;
    let { ease, intervalDays, repetitions, lapses } = item;

    switch (grade) {
      case "again":
        repetitions = 0;
        lapses += 1;
        ease = Math.max(c.minEase, ease - 0.2);
        return {
          ease: round2(ease),
          intervalDays: 0,
          repetitions,
          lapses,
          dueAt: new Date(now.getTime() + c.againIntervalMinutes * 60_000).toISOString(),
        };
      case "hard":
        repetitions += 1;
        ease = Math.max(c.minEase, ease - 0.15);
        intervalDays =
          repetitions <= 1 ? 1 : Math.max(1, Math.round(intervalDays * c.hardMultiplier));
        break;
      case "good":
        repetitions += 1;
        intervalDays =
          repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.round(intervalDays * ease);
        break;
      case "easy":
        repetitions += 1;
        ease += 0.15;
        intervalDays =
          repetitions === 1
            ? 2
            : repetitions === 2
              ? 5
              : Math.round(intervalDays * ease * c.easyMultiplier);
        break;
    }

    intervalDays = clamp(intervalDays, 1, 365);
    return {
      ease: round2(ease),
      intervalDays,
      repetitions,
      lapses,
      dueAt: new Date(now.getTime() + intervalDays * DAY).toISOString(),
    };
  }

  stateOf(item: LanguageVocabularyItem, now = new Date()): VocabState {
    if (item.repetitions === 0 && item.lastReviewedAt === null) return "new";
    if (
      item.intervalDays >= this.config.masteredIntervalDays &&
      item.ease >= this.config.masteredEase &&
      item.lapses <= 1
    ) {
      return "mastered";
    }
    return item.intervalDays >= 4 ? "review" : "learning";
  }

  masteryOf(item: LanguageVocabularyItem): number {
    if (item.repetitions === 0 && item.lastReviewedAt === null) return 0;
    const intervalScore = Math.min(1, item.intervalDays / this.config.masteredIntervalDays);
    const easeScore = clamp(
      (item.ease - this.config.minEase) / (2.7 - this.config.minEase),
      0,
      1,
    );
    const lapsePenalty = Math.min(0.3, item.lapses * 0.08);
    return Math.round(
      clamp(intervalScore * 0.7 + easeScore * 0.3 - lapsePenalty, 0, 1) * 100,
    );
  }

  isDue(item: LanguageVocabularyItem, now = new Date()): boolean {
    return (
      (item.repetitions > 0 || item.lastReviewedAt !== null) &&
      new Date(item.dueAt).getTime() <= now.getTime()
    );
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

let instance: LanguageReviewScheduler | null = null;
export function getScheduler(): LanguageReviewScheduler {
  if (!instance) instance = new LanguageReviewScheduler();
  return instance;
}
