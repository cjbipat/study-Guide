import type { QuizCelebration } from "@/lib/quiz/types";

/** Map a quiz celebration to fireworks intensity. Perfect = strongest. */
export function quizCelebration(c: QuizCelebration): {
  intensity: "low" | "medium" | "high";
  durationMs: number;
} {
  switch (c.kind) {
    case "perfect":
      return { intensity: "high", durationMs: 2600 };
    case "big-improvement":
      return { intensity: "high", durationMs: 1900 };
    case "first-quiz":
      return { intensity: "medium", durationMs: 1500 };
    case "great-score":
      return { intensity: "medium", durationMs: 1400 };
  }
}

export function celebrationHeading(c: QuizCelebration): string {
  switch (c.kind) {
    case "perfect":
      return "Perfect score!";
    case "big-improvement":
      return `Up ${c.delta} points!`;
    case "first-quiz":
      return "First quiz done!";
    case "great-score":
      return "Great score!";
  }
}
