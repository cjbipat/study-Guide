/**
 * Language skill progress + recommendations.
 *
 * Every number is derived from real reviews / sessions / attempts. Skills with
 * too little activity return `score: null` and the UI shows
 * "Keep practicing to measure this skill." Pronunciation NEVER gets a score —
 * there is no evaluator.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type {
  LanguageActivity,
  LanguageProfile,
  LanguageProgress,
  LanguageRecommendation,
  LanguageReview,
  LanguageSkill,
  LanguageVocabularyItem,
  SkillProgress,
  VocabState,
} from "@/lib/language/types";
import { getScheduler } from "@/lib/language/scheduler";
import { getLanguage } from "@/lib/language/catalog";
import { scenariosForLanguage } from "@/lib/language/conversation-content";

export const ALL_SKILLS: LanguageSkill[] = [
  "vocabulary",
  "listening",
  "speaking",
  "reading",
  "writing",
  "pronunciation",
];

export function vocabForProfile(
  snap: DatabaseSnapshot,
  profileId: string,
): LanguageVocabularyItem[] {
  return snap.vocab.filter((v) => v.profileId === profileId);
}

export function reviewsForProfile(
  snap: DatabaseSnapshot,
  profileId: string,
): LanguageReview[] {
  return snap.languageReviews
    .filter((r) => r.profileId === profileId)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function languageActivitiesForProfile(
  snap: DatabaseSnapshot,
  profileId: string,
): LanguageActivity[] {
  return snap.languageActivities
    .filter((a) => a.profileId === profileId)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/* ------------------------------------------------------------------ */
/*  Skill scoring                                                      */
/* ------------------------------------------------------------------ */

function rollingAccuracy(reviews: LanguageReview[], window = 24): number | null {
  const slice = reviews.slice(0, window);
  if (slice.length < 4) return null;
  const correct = slice.filter((r) => r.correct).length;
  return Math.round((correct / slice.length) * 100);
}

export function skillProgress(
  snap: DatabaseSnapshot,
  profileId: string,
  skill: LanguageSkill,
): SkillProgress {
  const reviews = reviewsForProfile(snap, profileId);
  const skillReviews = reviews.filter((r) => r.skill === skill);

  if (skill === "pronunciation") {
    const attempts = snap.pronunciationAttempts.filter(
      (a) => a.profileId === profileId,
    ).length;
    return {
      skill,
      score: null, // no evaluator — never scored
      attempts,
      hint:
        attempts === 0
          ? "Record yourself in Speaking or Shadowing to start."
          : "Pronunciation feedback is coming soon.",
    };
  }

  if (skill === "vocabulary") {
    const vocab = vocabForProfile(snap, profileId);
    const studied = vocab.filter(
      (v) => v.repetitions > 0 || v.lastReviewedAt !== null,
    );
    if (studied.length < 3) {
      return {
        skill,
        score: null,
        attempts: studied.length,
        hint: "Learn and review a few words to measure this skill.",
      };
    }
    const scheduler = getScheduler();
    const avg = Math.round(
      studied.reduce((a, v) => a + scheduler.masteryOf(v), 0) / studied.length,
    );
    return { skill, score: avg, attempts: studied.length, hint: "" };
  }

  if (skill === "speaking") {
    // volume/consistency of speaking + shadowing practice (no accuracy scoring)
    const attempts = reviews.filter(
      (r) => r.skill === "speaking" || r.mode === "shadowing",
    ).length;
    if (attempts < 3) {
      return {
        skill,
        score: null,
        attempts,
        hint: "Complete a few speaking or shadowing exercises to measure this skill.",
      };
    }
    return {
      skill,
      score: Math.min(100, Math.round(attempts * 8)),
      attempts,
      hint: "Reflects how consistently you practise speaking aloud.",
    };
  }

  // listening / reading / writing — rolling accuracy
  const acc = rollingAccuracy(skillReviews);
  if (acc === null) {
    return {
      skill,
      score: null,
      attempts: skillReviews.length,
      hint: `Complete a few ${skill} exercises to measure this skill.`,
    };
  }
  return { skill, score: acc, attempts: skillReviews.length, hint: "" };
}

export function languageProgress(
  snap: DatabaseSnapshot,
  profile: LanguageProfile,
): LanguageProgress {
  const scheduler = getScheduler();
  const now = new Date();
  const vocab = vocabForProfile(snap, profile.id);

  const vocabByState: Record<VocabState, number> = {
    new: 0,
    learning: 0,
    review: 0,
    mastered: 0,
  };
  let dueCount = 0;
  let newCount = 0;
  for (const v of vocab) {
    const state = scheduler.stateOf(v, now);
    vocabByState[state] += 1;
    if (state === "new") newCount += 1;
    else if (scheduler.isDue(v, now)) dueCount += 1;
  }

  const skills = {} as Record<LanguageSkill, SkillProgress>;
  for (const s of ALL_SKILLS) skills[s] = skillProgress(snap, profile.id, s);

  const scored = ALL_SKILLS.map((s) => skills[s].score).filter(
    (n): n is number => n !== null,
  );
  const overall = scored.length
    ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
    : null;

  return {
    profileId: profile.id,
    languageId: profile.languageId,
    skills,
    vocabTotal: vocab.length,
    vocabByState,
    dueCount,
    newCount,
    overall,
    streak: profile.streak,
  };
}

/* ------------------------------------------------------------------ */
/*  Milestones                                                         */
/* ------------------------------------------------------------------ */

export type LangMilestone =
  | { kind: "vocab-mastery"; value: 25 | 50 | 75 | 100 }
  | { kind: "streak"; value: 7 | 30 }
  | { kind: "perfect-challenge" }
  | { kind: "level-complete" };

export function crossedVocabMasteryMilestone(
  before: number | null,
  after: number | null,
): 25 | 50 | 75 | 100 | null {
  if (after === null) return null;
  const b = before ?? 0;
  for (const m of [100, 75, 50, 25] as const) {
    if (b < m && after >= m) return m;
  }
  return null;
}

export function milestoneCelebration(m: LangMilestone): {
  intensity: "low" | "medium" | "high";
  durationMs: number;
} {
  if (m.kind === "vocab-mastery") {
    return {
      25: { intensity: "low" as const, durationMs: 1100 },
      50: { intensity: "medium" as const, durationMs: 1500 },
      75: { intensity: "high" as const, durationMs: 1900 },
      100: { intensity: "high" as const, durationMs: 2600 },
    }[m.value];
  }
  if (m.kind === "streak")
    return m.value === 30
      ? { intensity: "high", durationMs: 2400 }
      : { intensity: "medium", durationMs: 1600 };
  if (m.kind === "level-complete") return { intensity: "high", durationMs: 2600 };
  return { intensity: "medium", durationMs: 1500 };
}

/* ------------------------------------------------------------------ */
/*  Recommendations                                                    */
/* ------------------------------------------------------------------ */

export function getLanguageRecommendation(
  snap: DatabaseSnapshot,
  profile: LanguageProfile,
): LanguageRecommendation {
  const prog = languageProgress(snap, profile);
  const acts = languageActivitiesForProfile(snap, profile.id);
  const lang = getLanguage(profile.languageId);
  const base = `/languages/${profile.id}`;

  const lastSession = acts.find((a) => a.type === "session-completed");
  const daysSince = lastSession
    ? Math.round((Date.now() - Date.parse(lastSession.at)) / 86_400_000)
    : null;

  // Haven't practised in a while
  if (daysSince !== null && daysSince >= 3) {
    return {
      kind: "welcome-back",
      title: "Welcome back",
      body: "Let's review what you learned before moving forward.",
      cta: "Review vocabulary",
      href: `${base}/practice/review`,
      skill: "vocabulary",
    };
  }

  const s = prog.skills;
  const vocabScore = s.vocabulary.score;

  // Tones: many recent misses on tonal language listening/speaking
  if (lang?.tonal) {
    const recent = reviewsForProfile(snap, profile.id).slice(0, 16);
    const toneMisses = recent.filter(
      (r) =>
        !r.correct && (r.skill === "listening" || r.skill === "speaking"),
    ).length;
    if (recent.length >= 8 && toneMisses >= 4) {
      return {
        kind: "practice-tones",
        title: "Practice your tones",
        body: `Tone practice could help strengthen your ${lang.name} pronunciation.`,
        cta: "Practice tones",
        href: `${base}/practice/tones`,
        skill: "pronunciation",
      };
    }
  }

  // Strong vocab, weak listening
  if (
    vocabScore !== null &&
    vocabScore >= 60 &&
    (s.listening.score === null || s.listening.score < vocabScore - 12)
  ) {
    return {
      kind: "focus-listening",
      title: "Focus on listening today",
      body: `Your vocabulary is improving. Let's strengthen your ability to understand spoken ${lang?.name ?? "the language"}.`,
      cta: "Start listening practice",
      href: `${base}/practice/listening`,
      skill: "listening",
    };
  }

  // Weak speaking relative to the rest
  if (
    vocabScore !== null &&
    vocabScore >= 50 &&
    s.speaking.score === null
  ) {
    return {
      kind: "focus-speaking",
      title: "Try speaking practice",
      body: "You know the words — now practise saying them out loud.",
      cta: "Start speaking practice",
      href: `${base}/practice/shadowing`,
      skill: "speaking",
    };
  }

  // Conversation — ready to use what they've learned in a real situation
  {
    const convScenarios = scenariosForLanguage(profile.languageId);
    if (convScenarios.length > 0) {
      const studied = vocabForProfile(snap, profile.id).filter(
        (v) => v.repetitions > 0 || v.lastReviewedAt !== null,
      ).length;
      const sessions = snap.conversationSessions.filter(
        (c) => c.profileId === profile.id,
      );
      const doneIds = new Set(sessions.map((c) => c.scenarioId));
      const available = convScenarios.find((sc) => {
        if (doneIds.has(sc.id)) return false;
        const need = sc.requiresVocabCount ?? 0;
        return need === 0 || studied >= need;
      });
      const lastConvAt = sessions.reduce(
        (max, c) => Math.max(max, Date.parse(c.endedAt)),
        0,
      );
      const daysSinceConv = lastConvAt
        ? (Date.now() - lastConvAt) / 86_400_000
        : Infinity;
      const goalWants =
        profile.goal === "travel" || profile.goal === "conversation";

      if (available && goalWants && daysSinceConv >= 1 && studied >= 6) {
        return {
          kind: "travel-conversation",
          title: "Practice Travel Conversations",
          body: "Your goal is travel. Let's practice a real-world situation.",
          cta: "Start a conversation",
          href: `${base}/practice/conversation`,
          skill: "speaking",
        };
      }
      if (
        available &&
        vocabScore !== null &&
        vocabScore >= 55 &&
        daysSinceConv >= 2
      ) {
        return {
          kind: "practice-conversation",
          title: "Ready to Use What You've Learned?",
          body: "You've learned enough vocabulary to practice a real conversation.",
          cta: "Start a conversation",
          href: `${base}/practice/conversation`,
          skill: "speaking",
        };
      }
    }
  }

  // Lots of new words waiting and few reviews due
  if (prog.newCount >= 5 && prog.dueCount < 3) {
    return {
      kind: "learn-vocab",
      title: "Learn something new",
      body: `${prog.newCount} words are waiting to be learned.`,
      cta: "Learn new words",
      href: `${base}/practice/learn`,
      skill: "vocabulary",
    };
  }

  if (prog.dueCount > 0) {
    return {
      kind: "review-vocab",
      title: "Reviews are due",
      body: `${prog.dueCount} word${prog.dueCount === 1 ? "" : "s"} ${prog.dueCount === 1 ? "is" : "are"} scheduled for review.`,
      cta: "Review now",
      href: `${base}/practice/review`,
      skill: "vocabulary",
    };
  }

  return {
    kind: "start-session",
    title: "Start today's session",
    body: "A balanced mix of review, new words, listening, and speaking.",
    cta: "Start session",
    href: `${base}/session`,
  };
}
