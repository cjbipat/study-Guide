/**
 * Contextual Conversation Mode — data models.
 *
 * A scenario is a pre-authored branching tree:
 *
 *   Scenario → Turns → (partner line | learner prompt)
 *                        Learner prompt → available responses
 *                                       → appropriate / recommended response(s)
 *                                       → next turn
 *
 * The structure is language-agnostic — the same shapes hold Mandarin, Spanish,
 * or anything added later. Nothing here understands free text: open-ended
 * ("type" / "speak") responses are never graded, only compared to a model line.
 */

import type { ISODateString } from "@/lib/types";

export type ConversationCategory =
  | "social"
  | "food"
  | "shopping"
  | "getting-around"
  | "family"
  | "work"
  | "travel"
  | "daily-life";

export type ConversationLevelBand = "beginner" | "intermediate" | "advanced";

/** How the learner replied at a given turn. */
export type ConversationResponseMode = "suggested" | "build" | "type" | "speak";

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

/** A word featured in a scenario — powers contextual taps + the review screen. */
export interface ConversationVocabulary {
  target: string;
  pronunciation: string;
  translation: string;
  example?: string;
  exampleTranslation?: string;
}

/** One selectable reply at a learner turn. */
export interface ConversationResponse {
  id: string;
  target: string;
  pronunciation: string;
  translation: string;
  /** true when this is a reasonable thing to say here */
  appropriate: boolean;
  /** shown after picking a less-appropriate option — teaches, never scolds */
  note?: string;
  /** branch target; when omitted the turn's own `next` is used */
  next?: string;
}

/** Progressive hints — revealed one at a time, never all at once. */
export interface ConversationHints {
  /** 1st tap — useful vocabulary */
  vocabulary: string;
  /** 2nd tap — sentence structure */
  structure: string;
  /** 3rd tap — a full example response */
  example: string;
}

export interface ConversationTurn {
  id: string;
  speaker: "partner" | "learner";

  /* partner turns */
  target?: string;
  pronunciation?: string;
  translation?: string;

  /** stage direction / scene note, shown as a context card ("The waiter comes over.") */
  direction?: string;

  /* learner turns */
  /** 3–4 suggested responses (multiple choice) */
  responses?: ConversationResponse[];
  /** word tiles for "Build the sentence" — the model answer, tokenised, + distractors */
  builder?: { tokens: string[]; answer: string[] };
  /** the model / example response for "Type" and "Speak" modes (never used to grade) */
  model?: { target: string; pronunciation: string; translation: string };
  hints?: ConversationHints;
  /** label for the end-of-conversation "You practiced" checklist */
  practiced?: string;

  /** linear successor (partner turns, and learner turns whose responses don't branch) */
  next?: string;
}

export interface ConversationScenario {
  id: string;
  languageId: string;
  category: ConversationCategory;
  level: ConversationLevelBand;
  icon: string;
  title: string;
  /** one line for the scenario card */
  tagline: string;
  /** setup screen — "You are at a coffee shop in Beijing." */
  context: string;
  /** setup screen — "Order a coffee and ask how much it costs." */
  goal: string;
  /** setup screen — ["Vocabulary", "Listening", "Speaking"] */
  skills: string[];
  estimatedMinutes: number;
  /** featured words — contextual taps + "Words to Remember" */
  vocabulary: ConversationVocabulary[];
  /** end-screen checklist — ["Greetings", "Ordering", "Asking Questions"] */
  practicedSummary: string[];
  turns: ConversationTurn[];
  firstTurnId: string;
  /**
   * Genuine progression gate: the learner needs this many studied vocabulary
   * words before the scenario unlocks. Keep it small — most scenarios are 0.
   */
  requiresVocabCount?: number;
}

/* ------------------------------------------------------------------ */
/*  Persisted history                                                  */
/* ------------------------------------------------------------------ */

export interface ConversationSession {
  id: string;
  profileId: string;
  languageId: string;
  scenarioId: string;
  scenarioTitle: string;
  category: ConversationCategory;
  startedAt: ISODateString;
  endedAt: ISODateString;
  /** learner turns completed */
  turnsCompleted: number;
  /** response modes the learner used at least once */
  modesUsed: ConversationResponseMode[];
  /** distinct featured words shown during the conversation */
  vocabEncountered: string[];
  /** words the learner sent into spaced review from this conversation */
  vocabAdded: string[];
  /** appropriate picks / graded picks on suggested + build turns */
  appropriateChoices: number;
  gradedChoices: number;
  xpEarned: number;
}

/* ------------------------------------------------------------------ */
/*  Computed view-models                                               */
/* ------------------------------------------------------------------ */

export interface ConversationProgress {
  totalSessions: number;
  scenariosCompleted: number;
  completedScenarioIds: string[];
  /** distinct featured words encountered across every conversation */
  wordsUsed: number;
  wordsAdded: number;
  /** consecutive days with at least one conversation */
  streakDays: number;
  byCategory: Partial<Record<ConversationCategory, number>>;
}

export type ConversationScenarioStatus = "completed" | "available" | "locked";

export interface ConversationScenarioView {
  scenario: ConversationScenario;
  status: ConversationScenarioStatus;
  /** when locked — how many more studied words are needed */
  wordsNeeded: number;
}

/** Milestones that earn fireworks — NOT every completed conversation. */
export type ConversationMilestone =
  | { kind: "first-conversation" }
  | { kind: "conversation-count"; value: 10 | 50 }
  | { kind: "category-complete"; category: ConversationCategory };
