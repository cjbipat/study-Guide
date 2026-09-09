/**
 * Conversation Mode — pure reducers + selectors over `DatabaseSnapshot`.
 *
 * Progress numbers are concrete and honest: scenarios completed, distinct words
 * encountered, words added to review, a day streak. There is NO "fluency score".
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type { LanguageProfile } from "@/lib/language/types";
import type {
  ConversationCategory,
  ConversationMilestone,
  ConversationProgress,
  ConversationResponseMode,
  ConversationScenario,
  ConversationScenarioStatus,
  ConversationScenarioView,
  ConversationSession,
} from "@/lib/language/conversation-types";
import {
  scenarioById,
  scenariosForLanguage,
} from "@/lib/language/conversation-content";
import { addVocabFromWord, getLanguageProfile } from "@/lib/language/store";
import { todayKey, uid } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Selectors                                                          */
/* ------------------------------------------------------------------ */

export function conversationSessionsForProfile(
  snap: DatabaseSnapshot,
  profileId: string,
): ConversationSession[] {
  return snap.conversationSessions
    .filter((s) => s.profileId === profileId)
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt));
}

function studiedVocabCount(snap: DatabaseSnapshot, profileId: string): number {
  return snap.vocab.filter(
    (v) =>
      v.profileId === profileId &&
      (v.repetitions > 0 || v.lastReviewedAt !== null),
  ).length;
}

export function conversationProgress(
  snap: DatabaseSnapshot,
  profileId: string,
): ConversationProgress {
  const sessions = conversationSessionsForProfile(snap, profileId);
  const completedIds = [...new Set(sessions.map((s) => s.scenarioId))];

  const words = new Set<string>();
  let wordsAdded = 0;
  const byCategory: Partial<Record<ConversationCategory, number>> = {};
  for (const s of sessions) {
    s.vocabEncountered.forEach((w) => words.add(w));
    wordsAdded += s.vocabAdded.length;
    byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
  }

  return {
    totalSessions: sessions.length,
    scenariosCompleted: completedIds.length,
    completedScenarioIds: completedIds,
    wordsUsed: words.size,
    wordsAdded,
    streakDays: conversationStreak(sessions),
    byCategory,
  };
}

function conversationStreak(sessions: ConversationSession[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => todayKey(new Date(s.endedAt))));
  let streak = 0;
  const cursor = new Date();
  // allow the streak to "hold" if they haven't done one today yet
  if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function scenarioStatusFor(
  snap: DatabaseSnapshot,
  profileId: string,
  scenario: ConversationScenario,
): { status: ConversationScenarioStatus; wordsNeeded: number } {
  const completed = snap.conversationSessions.some(
    (s) => s.profileId === profileId && s.scenarioId === scenario.id,
  );
  if (completed) return { status: "completed", wordsNeeded: 0 };
  const need = scenario.requiresVocabCount ?? 0;
  if (need > 0) {
    const have = studiedVocabCount(snap, profileId);
    if (have < need)
      return { status: "locked", wordsNeeded: need - have };
  }
  return { status: "available", wordsNeeded: 0 };
}

export function scenarioViewsForProfile(
  snap: DatabaseSnapshot,
  profile: LanguageProfile,
): ConversationScenarioView[] {
  return scenariosForLanguage(profile.languageId).map((scenario) => {
    const { status, wordsNeeded } = scenarioStatusFor(
      snap,
      profile.id,
      scenario,
    );
    return { scenario, status, wordsNeeded };
  });
}

/* ------------------------------------------------------------------ */
/*  Vocabulary from a conversation                                     */
/* ------------------------------------------------------------------ */

export function addConversationVocab(
  snap: DatabaseSnapshot,
  profileId: string,
  word: { target: string; translation: string; pronunciation: string },
  scenarioId: string,
): { snapshot: DatabaseSnapshot; duplicate: boolean } {
  const existing = snap.vocab.find(
    (v) => v.profileId === profileId && v.target === word.target,
  );
  if (existing) {
    // ensure the scenario tag is present, but never create a duplicate item
    if (!existing.tags.includes(`conversation:${scenarioId}`)) {
      return {
        snapshot: {
          ...snap,
          vocab: snap.vocab.map((v) =>
            v.id === existing.id
              ? { ...v, tags: [...v.tags, `conversation:${scenarioId}`] }
              : v,
          ),
        },
        duplicate: true,
      };
    }
    return { snapshot: snap, duplicate: true };
  }

  const { snapshot: withWord, item } = addVocabFromWord(snap, profileId, word);
  return {
    snapshot: {
      ...withWord,
      vocab: withWord.vocab.map((v) =>
        v.id === item.id
          ? {
              ...v,
              tags: [
                ...new Set([...v.tags, "conversation", `conversation:${scenarioId}`]),
              ],
            }
          : v,
      ),
    },
    duplicate: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Finishing a conversation                                           */
/* ------------------------------------------------------------------ */

export interface FinishConversationArgs {
  profileId: string;
  scenarioId: string;
  startedAt: string;
  turnsCompleted: number;
  modesUsed: ConversationResponseMode[];
  vocabEncountered: string[];
  vocabAdded: string[];
  appropriateChoices: number;
  gradedChoices: number;
}

export interface FinishConversationOutcome {
  snapshot: DatabaseSnapshot;
  session: ConversationSession;
  xpEarned: number;
  milestone: ConversationMilestone | null;
  progress: ConversationProgress;
}

export function finishConversation(
  snap: DatabaseSnapshot,
  args: FinishConversationArgs,
): FinishConversationOutcome {
  const profile = getLanguageProfile(snap, args.profileId);
  const scenario = scenarioById(args.scenarioId);
  const nowIso = new Date().toISOString();

  const xpEarned = 25 + args.appropriateChoices * 5 + args.vocabAdded.length * 4;

  const session: ConversationSession = {
    id: uid("cs"),
    profileId: args.profileId,
    languageId: profile?.languageId ?? scenario?.languageId ?? "",
    scenarioId: args.scenarioId,
    scenarioTitle: scenario?.title ?? "Conversation",
    category: scenario?.category ?? "daily-life",
    startedAt: args.startedAt,
    endedAt: nowIso,
    turnsCompleted: args.turnsCompleted,
    modesUsed: [...new Set(args.modesUsed)],
    vocabEncountered: [...new Set(args.vocabEncountered)],
    vocabAdded: [...new Set(args.vocabAdded)],
    appropriateChoices: args.appropriateChoices,
    gradedChoices: args.gradedChoices,
    xpEarned,
  };

  const completedBefore = new Set(
    snap.conversationSessions
      .filter((s) => s.profileId === args.profileId)
      .map((s) => s.scenarioId),
  );
  const totalBefore = snap.conversationSessions.filter(
    (s) => s.profileId === args.profileId,
  ).length;

  const next: DatabaseSnapshot = {
    ...snap,
    conversationSessions: [...snap.conversationSessions, session],
    languages: snap.languages.map((p) =>
      p.id === args.profileId ? { ...p, xp: p.xp + xpEarned } : p,
    ),
    languageActivities: [
      ...snap.languageActivities,
      {
        id: uid("la"),
        profileId: args.profileId,
        languageId: session.languageId,
        type: "conversation-completed" as const,
        at: nowIso,
        detail: `${session.scenarioTitle} — ${session.vocabEncountered.length} vocabulary words`,
        xpEarned,
      },
    ],
  };

  // milestones — NOT every conversation
  let milestone: ConversationMilestone | null = null;
  const totalAfter = totalBefore + 1;
  if (totalBefore === 0) {
    milestone = { kind: "first-conversation" };
  } else if (totalBefore < 10 && totalAfter >= 10) {
    milestone = { kind: "conversation-count", value: 10 };
  } else if (totalBefore < 50 && totalAfter >= 50) {
    milestone = { kind: "conversation-count", value: 50 };
  } else if (scenario && !completedBefore.has(scenario.id)) {
    // did this newly-completed scenario finish its whole category?
    const categoryScenarios = scenariosForLanguage(session.languageId).filter(
      (s) => s.category === scenario.category,
    );
    if (categoryScenarios.length >= 2) {
      const doneNow = new Set([...completedBefore, scenario.id]);
      if (categoryScenarios.every((s) => doneNow.has(s.id))) {
        milestone = {
          kind: "category-complete",
          category: scenario.category,
        };
      }
    }
  }

  return {
    snapshot: next,
    session,
    xpEarned,
    milestone,
    progress: conversationProgress(next, args.profileId),
  };
}

/* ------------------------------------------------------------------ */
/*  Fireworks mapping                                                  */
/* ------------------------------------------------------------------ */

export function conversationMilestoneCelebration(m: ConversationMilestone): {
  intensity: "low" | "medium" | "high";
  durationMs: number;
} {
  if (m.kind === "first-conversation")
    return { intensity: "low", durationMs: 1100 };
  if (m.kind === "conversation-count")
    return m.value === 50
      ? { intensity: "high", durationMs: 2400 }
      : { intensity: "medium", durationMs: 1600 };
  return { intensity: "medium", durationMs: 1700 }; // category-complete
}

export function conversationMilestoneHeading(m: ConversationMilestone): string {
  if (m.kind === "first-conversation") return "First conversation done!";
  if (m.kind === "conversation-count")
    return `${m.value} conversations completed!`;
  return "Scenario category complete!";
}
