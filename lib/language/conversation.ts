/**
 * Conversation Mode — service seam.
 *
 *   UI  →  ConversationProvider  →  (today) pre-authored trees
 *                                →  (future) AIConversationProvider
 *
 * `StructuredConversationProvider` walks the hand-written scenario trees in
 * `conversation-content.ts`. It is deterministic and honest:
 *
 *   • suggested / build responses are checked against the authored `appropriate`
 *     flag — a real verdict, because the learner picked from a fixed set.
 *   • typed / spoken responses are NEVER graded. `evaluateOpenResponse` returns
 *     `graded: false` with the honest "coming soon" message and the model line
 *     so the learner can self-compare.
 *
 * An `AIConversationProvider` would implement the same interface (plus the
 * optional `generateScenario` / `generateReply`) and drop in behind
 * `getConversationProvider()` with no UI change.
 */

import type {
  ConversationResponse,
  ConversationScenario,
  ConversationTurn,
} from "@/lib/language/conversation-types";
import {
  scenarioById,
  scenariosForLanguage,
} from "@/lib/language/conversation-content";

export interface OpenResponseEvaluation {
  graded: false;
  message: string;
  model: { target: string; pronunciation: string; translation: string } | null;
}

export interface ChoiceResolution {
  appropriate: boolean;
  note?: string;
  /** null → the conversation ends after this turn */
  nextTurnId: string | null;
}

export interface ConversationProvider {
  readonly id: string;
  /** false for the structured provider — no model understands free text */
  readonly usesAI: boolean;

  listScenarios(languageId: string): ConversationScenario[];
  getScenario(scenarioId: string): ConversationScenario | undefined;

  /** first turn of a scenario, or null if the scenario is unknown */
  startConversation(scenarioId: string): {
    scenario: ConversationScenario;
    turn: ConversationTurn;
  } | null;

  getTurn(scenario: ConversationScenario, turnId: string): ConversationTurn | undefined;

  /** the linear successor of a turn (partner lines, un-branched learner turns) */
  nextTurn(
    scenario: ConversationScenario,
    fromTurnId: string,
  ): ConversationTurn | null;

  /** resolve a scripted (suggested / build) selection */
  resolveChoice(turn: ConversationTurn, responseId: string): ChoiceResolution;

  /** honest, never-graded evaluation of a typed or spoken reply */
  evaluateOpenResponse(turn: ConversationTurn): OpenResponseEvaluation;

  /* ---- future AI seam (not connected) ---- */
  generateScenario?(args: {
    languageId: string;
    topic: string;
    level: string;
  }): Promise<ConversationScenario>;
  generateReply?(args: {
    scenario: ConversationScenario;
    history: ConversationTurn[];
    learnerText: string;
  }): Promise<ConversationTurn>;
}

const OPEN_RESPONSE_MESSAGE =
  "Automatic conversation feedback is coming soon. For now, compare your answer with the example response below.";

class StructuredConversationProvider implements ConversationProvider {
  readonly id = "structured";
  readonly usesAI = false;

  listScenarios(languageId: string) {
    return scenariosForLanguage(languageId);
  }

  getScenario(scenarioId: string) {
    return scenarioById(scenarioId);
  }

  startConversation(scenarioId: string) {
    const scenario = scenarioById(scenarioId);
    if (!scenario) return null;
    const turn = scenario.turns.find((t) => t.id === scenario.firstTurnId);
    if (!turn) return null;
    return { scenario, turn };
  }

  getTurn(scenario: ConversationScenario, turnId: string) {
    return scenario.turns.find((t) => t.id === turnId);
  }

  nextTurn(scenario: ConversationScenario, fromTurnId: string) {
    const turn = this.getTurn(scenario, fromTurnId);
    if (!turn?.next) return null;
    return this.getTurn(scenario, turn.next) ?? null;
  }

  resolveChoice(turn: ConversationTurn, responseId: string): ChoiceResolution {
    const response: ConversationResponse | undefined = turn.responses?.find(
      (r) => r.id === responseId,
    );
    if (!response) {
      return { appropriate: false, nextTurnId: turn.next ?? null };
    }
    return {
      appropriate: response.appropriate,
      note: response.note,
      nextTurnId: response.next ?? turn.next ?? null,
    };
  }

  evaluateOpenResponse(turn: ConversationTurn): OpenResponseEvaluation {
    return {
      graded: false,
      message: OPEN_RESPONSE_MESSAGE,
      model: turn.model ?? null,
    };
  }
}

let provider: ConversationProvider | null = null;

export function getConversationProvider(): ConversationProvider {
  if (!provider) provider = new StructuredConversationProvider();
  return provider;
}

/** test seam */
export function __setConversationProvider(p: ConversationProvider | null) {
  provider = p;
}
