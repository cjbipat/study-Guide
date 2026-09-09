/**
 * getNextBestAction() — the Hub's central recommendation engine.
 *
 * Deterministic priority ladder (no randomness):
 *   P1  DUE REVIEWS         — spaced-repetition is time-sensitive
 *   P2  WEAKNESSES          — real missed questions / repeated mistakes
 *   P3  ACTIVE IN PROGRESS  — help finish what was started
 *   P4  KNOWLEDGE CHECK     — studied but never tested
 *   P5  NEW LEARNING        — only when nothing above applies
 *   Fallbacks               — no content / content-no-activity / thin-data
 *
 * Every recommendation carries a `reason` traceable to stored data. When there
 * isn't enough data, the engine still returns a reasonable next action — it
 * never invents weaknesses or progress.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type {
  DueReview,
  InProgressItem,
  LearningRecommendation,
  RecommendationType,
} from "@/lib/learning/types";
import {
  languageSignals,
  quizSignals,
  openStudySession,
  openLanguageSession,
  estFlashcardMinutes,
  estVocabMinutes,
  estQuizMinutes,
  hasAnyContent,
  hasAnyActivity,
} from "@/lib/learning/selectors";
import { detectWeaknesses } from "@/lib/learning/weaknesses";
import { learningItemsForMaterialId, materialMastery } from "@/lib/materials/progress";
import { getRecommendedStudyAction } from "@/lib/materials/recommendation";
import { getLanguageRecommendation } from "@/lib/language/progress";
import { quizzesForSource } from "@/lib/quiz/selectors";
import { StudyMaterialService } from "@/lib/materials/processor";
import { getLanguage } from "@/lib/language/catalog";

/* base priorities per tier */
const P1_DUE = 900;
const P2_WEAK = 700;
const P3_PROGRESS = 500;
const P4_CHECK = 300;
const P5_NEW = 100;

function plural(n: number, s: string) {
  return `${n} ${s}${n === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------------------ */
/*  P1 — due reviews                                                   */
/* ------------------------------------------------------------------ */

/** Every due-review bucket, attributed to a material when the cards came from one. */
export function dueReviews(snap: DatabaseSnapshot, now = new Date()): DueReview[] {
  const out: DueReview[] = [];

  // flashcards, grouped by source material when present
  const dueCards = snap.cards.filter((c) => {
    const seen = c.repetitions > 0 || c.lastReviewedAt !== null;
    return seen && Date.parse(c.dueAt) <= now.getTime();
  });

  const byMaterial = new Map<string, number>();
  const byDeck = new Map<string, number>();
  for (const c of dueCards) {
    if (c.sourceMaterialId) {
      byMaterial.set(c.sourceMaterialId, (byMaterial.get(c.sourceMaterialId) ?? 0) + 1);
    } else {
      byDeck.set(c.deckId, (byDeck.get(c.deckId) ?? 0) + 1);
    }
  }

  for (const [materialId, count] of byMaterial) {
    const material = snap.materials.find((m) => m.id === materialId);
    if (!material) continue;
    const item = learningItemsForMaterialId(snap, materialId).find(
      (i) => i.type === "flashcards" && i.deckId,
    );
    const href = item?.deckId
      ? `/study/${item.deckId}?item=${item.id}`
      : material.deckId
        ? `/study/${material.deckId}`
        : `/materials/${materialId}`;
    out.push({
      sourceType: "deck",
      sourceId: item?.deckId ?? material.deckId ?? materialId,
      label: `${material.name.replace(/\.[a-z0-9]+$/i, "")} flashcards`,
      count,
      estimatedMinutes: estFlashcardMinutes(count),
      action: { label: `Review ${plural(count, "card")}`, href },
    });
  }

  for (const [deckId, count] of byDeck) {
    const deck = snap.decks.find((d) => d.id === deckId);
    if (!deck) continue;
    out.push({
      sourceType: "deck",
      sourceId: deckId,
      label: deck.name,
      count,
      estimatedMinutes: estFlashcardMinutes(count),
      action: { label: `Review ${plural(count, "card")}`, href: `/study/${deckId}` },
    });
  }

  // language vocab due
  for (const l of languageSignals(snap, now)) {
    if (l.dueCount <= 0) continue;
    out.push({
      sourceType: "language",
      sourceId: l.profileId,
      label: `${l.name} vocabulary`,
      count: l.dueCount,
      estimatedMinutes: estVocabMinutes(l.dueCount),
      action: {
        label: `Review ${plural(l.dueCount, "word")}`,
        href: `/languages/${l.profileId}/practice/review`,
      },
    });
  }

  return out.sort((a, b) => b.count - a.count || a.sourceId.localeCompare(b.sourceId));
}

function dueRecommendations(snap: DatabaseSnapshot): LearningRecommendation[] {
  return dueReviews(snap).map((d, i) => {
    const isLang = d.sourceType === "language";
    return {
      id: `due-${d.sourceType}-${d.sourceId}`,
      priority: P1_DUE + Math.min(d.count, 40) - i,
      type: (isLang ? "PracticeLanguage" : "ReviewFlashcards") as RecommendationType,
      title: isLang ? `Review ${d.label}` : `Review ${d.label}`,
      description: isLang
        ? `${plural(d.count, "word")} scheduled for review right now.`
        : `${plural(d.count, "flashcard")} scheduled for review right now.`,
      estimatedMinutes: d.estimatedMinutes,
      sourceType: d.sourceType,
      sourceId: d.sourceId,
      reason: {
        code: isLang ? "language-vocab-due" : "flashcards-due",
        text: isLang
          ? `You have ${plural(d.count, "word")} due for review in ${d.label}.`
          : `You have ${plural(d.count, "flashcard")} due for review.`,
      },
      action: d.action,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  P2 — weaknesses                                                    */
/* ------------------------------------------------------------------ */

function weaknessRecommendations(snap: DatabaseSnapshot): LearningRecommendation[] {
  return detectWeaknesses(snap).map((w) => {
    const type: RecommendationType =
      w.kind === "quiz-topic" || w.kind === "quiz-questions"
        ? "ReviewQuizMistakes"
        : w.kind === "flashcards"
          ? "ReviewFlashcards"
          : "PracticeLanguage";
    return {
      id: w.id,
      priority: P2_WEAK + w.severity,
      type,
      title:
        w.kind === "quiz-topic"
          ? `Shore up ${w.title}`
          : w.kind === "quiz-questions"
            ? `Review your ${w.title} mistakes`
            : `Work on ${w.title}`,
      description: w.evidence,
      estimatedMinutes: w.estimatedMinutes,
      sourceType: w.sourceType,
      sourceId: w.sourceId,
      reason: { code: `weakness-${w.kind}`, text: w.evidence },
      action: w.action,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  P3 — active learning in progress                                   */
/* ------------------------------------------------------------------ */

export function inProgressItems(snap: DatabaseSnapshot): InProgressItem[] {
  const out: InProgressItem[] = [];

  const openStudy = openStudySession(snap);
  if (openStudy) {
    const deck = snap.decks.find((d) => d.id === openStudy.deckId);
    out.push({
      sourceType: "deck",
      sourceId: openStudy.deckId,
      label: deck?.name ?? "your deck",
      detail: "Study session in progress",
      estimatedMinutes: 5,
      action: { label: "Resume session", href: `/study/${openStudy.deckId}` },
    });
  }

  const openLang = openLanguageSession(snap);
  if (openLang) {
    const profile = snap.languages.find((p) => p.id === openLang.profileId);
    const name = getLanguage(profile?.languageId ?? "")?.name ?? "language";
    out.push({
      sourceType: "language",
      sourceId: openLang.profileId,
      label: name,
      detail: "Language session started but not finished",
      estimatedMinutes: profile?.dailyMinutes ?? 10,
      action: {
        label: "Continue session",
        href: `/languages/${openLang.profileId}/session`,
      },
    });
  }

  // materials that have been started but aren't mastered and have nothing due
  for (const m of snap.materials) {
    const mm = materialMastery(snap, m.id);
    if (!mm.hasActivity) continue;
    if (mm.score !== null && mm.score >= 90) continue;
    const dueForThis = snap.cards.some(
      (c) =>
        c.sourceMaterialId === m.id &&
        (c.repetitions > 0 || c.lastReviewedAt !== null) &&
        Date.parse(c.dueAt) <= Date.now(),
    );
    if (dueForThis) continue; // already covered by P1
    const rec = getRecommendedStudyAction(snap, m);
    if (rec.kind === "review-again" || rec.kind === "open-material") continue;
    out.push({
      sourceType: "material",
      sourceId: m.id,
      label: m.name.replace(/\.[a-z0-9]+$/i, ""),
      detail: rec.reason,
      estimatedMinutes: 8,
      action: { label: rec.label, href: rec.href },
    });
  }

  return out;
}

function inProgressRecommendations(snap: DatabaseSnapshot): LearningRecommendation[] {
  return inProgressItems(snap).map((p, i) => {
    const type: RecommendationType =
      p.sourceType === "language"
        ? "ContinueLanguageSession"
        : p.sourceType === "material"
          ? "StudyMaterial"
          : "ReviewFlashcards";
    const isOpenSession =
      p.detail.includes("in progress") || p.detail.includes("not finished");
    return {
      id: `progress-${p.sourceType}-${p.sourceId}`,
      priority: P3_PROGRESS + (isOpenSession ? 60 : 20) - i,
      type,
      title: isOpenSession ? `Finish your ${p.label} session` : `Keep going with ${p.label}`,
      description: p.detail,
      estimatedMinutes: p.estimatedMinutes,
      sourceType: p.sourceType,
      sourceId: p.sourceId,
      reason: {
        code: isOpenSession ? "session-in-progress" : "material-in-progress",
        text: isOpenSession
          ? p.sourceType === "language"
            ? `You started this ${p.label} session but haven't completed it.`
            : `You have a study session in progress.`
          : `You've started ${p.label} but haven't finished it.`,
      },
      action: p.action,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  P4 — knowledge check                                               */
/* ------------------------------------------------------------------ */

export function knowledgeChecks(snap: DatabaseSnapshot): LearningRecommendation[] {
  const out: LearningRecommendation[] = [];

  for (const m of snap.materials) {
    const studied = snap.activities.some(
      (a) => a.materialId === m.id && a.type === "flashcard-session",
    );
    if (!studied) continue;
    const quizzes = quizzesForSource(snap, "material", m.id);
    const attempted = quizzes.some((q) =>
      snap.quizAttempts.some((a) => a.quizId === q.id),
    );
    if (attempted) continue;
    // respect honest material processing rules — only if a quiz can be generated
    if (quizzes.length === 0 && !StudyMaterialService.canGenerate(m)) continue;

    const name = m.name.replace(/\.[a-z0-9]+$/i, "");
    out.push({
      id: `check-${m.id}`,
      priority: P4_CHECK + 20,
      type: "TakeQuiz",
      title: `Test your knowledge: ${name}`,
      description: `You've studied ${name} but haven't checked yourself with a quiz.`,
      estimatedMinutes: quizzes[0] ? estQuizMinutes(quizzes[0].questions.length) : 6,
      sourceType: "material",
      sourceId: m.id,
      reason: {
        code: "studied-not-tested",
        text: `You've studied ${name} but haven't tested yourself yet.`,
      },
      action: quizzes[0]
        ? { label: "Take the quiz", href: `/quizzes/${quizzes[0].id}` }
        : { label: "Create a quiz", href: `/quizzes/create?source=material&id=${m.id}` },
    });
  }

  // quizzes created but never attempted
  for (const s of quizSignals(snap)) {
    if (s.attempts.length > 0) continue;
    if (s.quiz.source.type === "material") continue; // handled above
    out.push({
      id: `check-quiz-${s.quiz.id}`,
      priority: P4_CHECK,
      type: "TakeQuiz",
      title: `Take the ${s.quiz.title} quiz`,
      description: `${s.quiz.questions.length} questions · you haven't attempted this yet.`,
      estimatedMinutes: estQuizMinutes(s.quiz.questions.length),
      sourceType: "quiz",
      sourceId: s.quiz.id,
      reason: {
        code: "quiz-not-attempted",
        text: `You created this quiz but haven't taken it yet.`,
      },
      action: { label: "Start quiz", href: `/quizzes/${s.quiz.id}` },
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  P5 — new learning                                                  */
/* ------------------------------------------------------------------ */

function newLearningRecommendations(snap: DatabaseSnapshot): LearningRecommendation[] {
  const out: LearningRecommendation[] = [];

  for (const l of languageSignals(snap)) {
    if (l.newCount < 5 || l.dueCount >= 3) continue;
    out.push({
      id: `new-vocab-${l.profileId}`,
      priority: P5_NEW + Math.min(l.newCount, 20),
      type: "LearnVocabulary",
      title: `Learn new ${l.name} words`,
      description: `${plural(l.newCount, "word")} are ready to learn.`,
      estimatedMinutes: 8,
      sourceType: "language",
      sourceId: l.profileId,
      reason: {
        code: "new-vocab-available",
        text: `${plural(l.newCount, "new word")} are waiting in ${l.name}.`,
      },
      action: {
        label: "Learn new words",
        href: `/languages/${l.profileId}/practice/learn`,
      },
    });
  }

  // per-language richer suggestion from the existing engine (conversation, etc.)
  for (const profile of snap.languages) {
    const r = getLanguageRecommendation(snap, profile);
    if (["review-vocab", "learn-vocab", "start-session"].includes(r.kind)) continue;
    const name = getLanguage(profile.languageId)?.name ?? "language";
    out.push({
      id: `lang-rec-${profile.id}-${r.kind}`,
      priority: P5_NEW + 30,
      type:
        r.kind === "practice-conversation" || r.kind === "travel-conversation"
          ? "ContinueConversation"
          : "PracticeLanguage",
      title: r.title,
      description: r.body,
      estimatedMinutes: 10,
      sourceType: "language",
      sourceId: profile.id,
      reason: { code: `lang-${r.kind}`, text: `${name}: ${r.body}` },
      action: { label: r.cta, href: r.href },
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Fallbacks                                                          */
/* ------------------------------------------------------------------ */

function fallbackRecommendations(snap: DatabaseSnapshot): LearningRecommendation[] {
  if (!hasAnyContent(snap)) {
    return [
      {
        id: "fallback-get-started",
        priority: 5,
        type: "GetStarted",
        title: "Start learning something new",
        description:
          "Upload study material, build a deck, or pick a language to begin.",
        reason: {
          code: "no-content",
          text: "You haven't added anything to learn yet.",
        },
        action: { label: "Upload material", href: "/materials" },
      },
    ];
  }

  if (!hasAnyActivity(snap)) {
    const newest = [...snap.materials].sort(
      (a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt),
    )[0];
    if (newest) {
      const name = newest.name.replace(/\.[a-z0-9]+$/i, "");
      return [
        {
          id: "fallback-ready-to-start",
          priority: 200,
          type: "StudyMaterial",
          title: `Ready to start ${name}?`,
          description: "You've added this but haven't studied it yet.",
          estimatedMinutes: 8,
          sourceType: "material",
          sourceId: newest.id,
          reason: {
            code: "content-no-activity",
            text: `${name} is your most recently added material.`,
          },
          action: { label: "Open material", href: `/materials/${newest.id}` },
        },
      ];
    }
    const deck = snap.decks.find((d) => snap.cards.some((c) => c.deckId === d.id));
    if (deck) {
      return [
        {
          id: "fallback-start-deck",
          priority: 200,
          type: "ReviewFlashcards",
          title: `Start studying ${deck.name}`,
          description: "This deck is ready — begin your first session.",
          sourceType: "deck",
          sourceId: deck.id,
          reason: {
            code: "content-no-activity",
            text: `${deck.name} has cards ready to study.`,
          },
          action: { label: "Start studying", href: `/study/${deck.id}` },
        },
      ];
    }
  }

  return [
    {
      id: "fallback-keep-learning",
      priority: 80,
      type: "GetStarted",
      title: "Keep your learning moving",
      description:
        "Not enough history yet to pinpoint a weakness — keep practising and the Hub will adapt.",
      reason: {
        code: "thin-data",
        text: "There isn't enough activity yet to recommend something specific.",
      },
      action: { label: "Browse your library", href: "/decks" },
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Assembly                                                           */
/* ------------------------------------------------------------------ */

/** All recommendations, most important first. Deterministic ordering. */
export function buildRecommendations(
  snap: DatabaseSnapshot,
): LearningRecommendation[] {
  const all = [
    ...dueRecommendations(snap),
    ...weaknessRecommendations(snap),
    ...inProgressRecommendations(snap),
    ...knowledgeChecks(snap),
    ...newLearningRecommendations(snap),
  ];

  // de-dupe by (type + sourceId), keeping the highest priority
  const seen = new Map<string, LearningRecommendation>();
  for (const r of all) {
    const key = `${r.type}:${r.sourceId ?? ""}`;
    const prev = seen.get(key);
    if (!prev || r.priority > prev.priority) seen.set(key, r);
  }

  const ranked = [...seen.values()].sort(
    (a, b) =>
      b.priority - a.priority ||
      (a.sourceId ?? "").localeCompare(b.sourceId ?? "") ||
      a.id.localeCompare(b.id),
  );

  if (ranked.length === 0) return fallbackRecommendations(snap);

  // Always append a fallback so the list is never empty downstream, but only
  // when it adds something new.
  return ranked;
}

/** The single most valuable next action. Always returns something. */
export function getNextBestAction(snap: DatabaseSnapshot): LearningRecommendation {
  const ranked = buildRecommendations(snap);
  if (ranked.length > 0 && ranked[0].priority > 80) return ranked[0];
  const fb = fallbackRecommendations(snap);
  // prefer a concrete ranked item over a thin-data fallback when one exists
  if (ranked.length > 0 && ranked[0].priority >= fb[0].priority) return ranked[0];
  return fb[0];
}
