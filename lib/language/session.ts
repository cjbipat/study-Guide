/**
 * Today's Language Session — a structured, adaptive plan.
 *
 * Built from the profile's daily time budget and real progress: weights toward
 * whatever skill is lagging, skips review when nothing is due, scales the
 * new-word count to the time available.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type {
  LanguageProfile,
  PracticeMode,
  SessionBlock,
  TodaySessionPlan,
} from "@/lib/language/types";
import { getLanguage } from "@/lib/language/catalog";
import { languageProgress, vocabForProfile } from "@/lib/language/progress";
import { getScheduler } from "@/lib/language/scheduler";
import { scenariosForLanguage } from "@/lib/language/conversation-content";

const MODE_META: Record<
  PracticeMode,
  { skill: SessionBlock["skill"]; label: string }
> = {
  review: { skill: "vocabulary", label: "Review" },
  learn: { skill: "vocabulary", label: "Learn" },
  listening: { skill: "listening", label: "Listen" },
  speaking: { skill: "speaking", label: "Speak" },
  shadowing: { skill: "speaking", label: "Listen & Repeat" },
  reading: { skill: "reading", label: "Read" },
  writing: { skill: "writing", label: "Write" },
  characters: { skill: "reading", label: "Characters" },
  tones: { skill: "pronunciation", label: "Tones" },
  conversation: { skill: "speaking", label: "Conversation" },
};

export function buildSessionPlan(
  snap: DatabaseSnapshot,
  profile: LanguageProfile,
): TodaySessionPlan {
  const minutes = profile.dailyMinutes;
  const prog = languageProgress(snap, profile);
  const lang = getLanguage(profile.languageId);
  const scheduler = getScheduler();
  const now = new Date();

  const vocab = vocabForProfile(snap, profile.id);
  const due = vocab.filter((v) => scheduler.isDue(v, now));
  const fresh = vocab.filter(
    (v) => v.repetitions === 0 && v.lastReviewedAt === null,
  );

  // per-minute item budgets
  const reviewCap = Math.min(due.length, Math.max(4, Math.round(minutes * 1.6)));
  const learnCap = Math.min(
    fresh.length,
    minutes <= 5 ? 2 : minutes <= 10 ? 3 : minutes <= 15 ? 5 : minutes <= 30 ? 8 : 12,
  );

  const blocks: SessionBlock[] = [];
  const add = (mode: PracticeMode, mins: number, count: number) => {
    if (count <= 0 && mode !== "tones") return;
    const m = MODE_META[mode];
    blocks.push({ mode, skill: m.skill, label: m.label, minutes: mins, itemCount: count });
  };

  // 1. Review (skip if nothing is due)
  if (reviewCap > 0) add("review", Math.max(2, Math.round(minutes * 0.34)), reviewCap);

  // 2. Learn new
  if (learnCap > 0) add("learn", Math.max(2, Math.round(minutes * 0.26)), learnCap);

  // 3. Listen
  const listenItems = minutes <= 5 ? 2 : minutes <= 15 ? 3 : 5;
  if (minutes >= 5) add("listening", Math.max(1, Math.round(minutes * 0.2)), listenItems);

  // 4. Speak / shadow — bias here if speaking is the weak skill
  if (minutes >= 10) {
    const speakWeak =
      prog.skills.speaking.score === null ||
      (prog.skills.vocabulary.score ?? 0) - (prog.skills.speaking.score ?? 0) > 15;
    add("shadowing", Math.max(1, Math.round(minutes * (speakWeak ? 0.18 : 0.12))), speakWeak ? 3 : 2);
  }

  // 5. Conversation — sometimes, when the learner is ready to use what they know.
  //    Deterministic: needs authored scenarios, a real vocabulary base or a
  //    goal that calls for it, and enough time in the session.
  const studiedCount = vocab.filter(
    (v) => v.repetitions > 0 || v.lastReviewedAt !== null,
  ).length;
  const goalWantsConversation =
    profile.goal === "conversation" || profile.goal === "travel";
  const hasScenarios = scenariosForLanguage(profile.languageId).length > 0;
  if (
    hasScenarios &&
    minutes >= 10 &&
    (goalWantsConversation ? studiedCount >= 6 : studiedCount >= 15)
  ) {
    add("conversation", Math.max(2, Math.round(minutes * 0.22)), 1);
  }

  // 6. Tones (tonal languages only) or a challenge
  if (minutes >= 5) {
    if (lang?.tonal && minutes >= 15) add("tones", 1, 5);
    add("review", 1, Math.min(due.length + fresh.length, minutes >= 15 ? 8 : 5)); // quick challenge = final recall pass
  }

  // relabel the trailing review block as the challenge
  if (blocks.length) {
    const last = blocks[blocks.length - 1];
    if (last.mode === "review" && blocks.filter((b) => b.mode === "review").length > 1) {
      last.label = "Challenge";
    }
  }

  const totalMinutes = blocks.reduce((a, b) => a + b.minutes, 0);

  return {
    blocks,
    totalMinutes: Math.max(totalMinutes, Math.round(minutes * 0.8)),
    dueVocab: due.length,
    newVocab: fresh.length,
    listeningItems: listenItems,
    speakingItems: minutes >= 10 ? 3 : 0,
    challengeItems: minutes >= 15 ? 8 : 5,
  };
}

/* ------------------------------------------------------------------ */
/*  Daily challenges                                                   */
/* ------------------------------------------------------------------ */

export interface LanguageChallenge {
  id: string;
  title: string;
  description: string;
  mode: PracticeMode;
  target: number;
  xp: number;
}

export function dailyChallenges(profile: LanguageProfile): LanguageChallenge[] {
  return [
    {
      id: "ten-word",
      title: "10 Word Challenge",
      description: "Recall 10 vocabulary words.",
      mode: "review",
      target: 10,
      xp: 40,
    },
    {
      id: "listening-sprint",
      title: "Listening Sprint",
      description: "Understand 5 audio clips.",
      mode: "listening",
      target: 5,
      xp: 35,
    },
    {
      id: "speaking-streak",
      title: "Speaking Streak",
      description: "Complete 3 speaking exercises.",
      mode: "shadowing",
      target: 3,
      xp: 30,
    },
  ];
}
