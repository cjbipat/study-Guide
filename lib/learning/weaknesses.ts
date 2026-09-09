/**
 * Weakness detection — from real evidence only.
 *
 * A weakness is never a fabricated percentage. It comes from:
 *   - quiz questions actually missed (per topic when reliable topic metadata
 *     exists, otherwise "questions to review")
 *   - flashcards with real lapses / shaky scheduling state
 *   - language vocab repeatedly rated "again", or a measured low listening
 *     accuracy from enough reviews
 *
 * IMPROVEMENT IS RECOGNISED: if a quiz's recent trend is clearly upward or the
 * latest performance is strong, its questions are NOT reported as a weakness —
 * the learner has moved past it.
 *
 * Pronunciation never produces a weakness with a score — there is no evaluator.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type { LearningWeakness } from "@/lib/learning/types";
import { buildResultView } from "@/lib/quiz/store";
import { skillProgress } from "@/lib/language/progress";
import { getLanguage } from "@/lib/language/catalog";
import {
  deckSignals,
  languageSignals,
  quizSignals,
  estFlashcardMinutes,
  estVocabMinutes,
} from "@/lib/learning/selectors";

function plural(n: number, s: string): string {
  return `${n} ${s}${n === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------------------ */
/*  Quiz weaknesses                                                    */
/* ------------------------------------------------------------------ */

function quizWeaknesses(snap: DatabaseSnapshot): LearningWeakness[] {
  const out: LearningWeakness[] = [];

  for (const s of quizSignals(snap)) {
    if (!s.lastAttempt) continue;
    // Recognise improvement — don't keep calling them weak where they now do well.
    if (s.improving || s.strong) continue;
    if (s.lastAttempt.score >= 80) continue;

    const view = buildResultView(snap, s.lastAttempt.id);
    if (!view) continue;

    const isMaterial = s.quiz.source.type === "material" && s.quiz.source.id;
    const reviewHref = isMaterial
      ? `/materials/${s.quiz.source.id}`
      : `/quizzes/${s.quiz.id}/review`;
    const reviewLabel = isMaterial ? "Review the material" : "Review your mistakes";

    const weakTopics = view.topics.filter(
      (t) => t.total > 0 && t.correct / t.total < 0.7 && t.total - t.correct >= 1,
    );

    if (weakTopics.length > 0) {
      for (const t of weakTopics) {
        const missed = t.total - t.correct;
        out.push({
          id: `weak-${s.quiz.id}-topic-${t.topic}`,
          kind: "quiz-topic",
          sourceType: isMaterial ? "material" : "quiz",
          sourceId: (isMaterial ? s.quiz.source.id : s.quiz.id) as string,
          title: t.topic,
          evidence: `You missed ${plural(missed, "question")} about ${t.topic} in your last ${s.quiz.title} quiz.`,
          severity: Math.round((1 - t.correct / t.total) * 100),
          estimatedMinutes: isMaterial ? 8 : 4,
          action: { label: reviewLabel, href: reviewHref },
        });
      }
    } else if (view.missed.length > 0) {
      out.push({
        id: `weak-${s.quiz.id}-questions`,
        kind: "quiz-questions",
        sourceType: isMaterial ? "material" : "quiz",
        sourceId: (isMaterial ? s.quiz.source.id : s.quiz.id) as string,
        title: s.quiz.title,
        evidence: `You missed ${plural(view.missed.length, "question")} on your last ${s.quiz.title} attempt.`,
        severity: Math.round((view.missed.length / s.lastAttempt.total) * 100),
        estimatedMinutes: 4,
        action: { label: reviewLabel, href: reviewHref },
      });
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Flashcard weaknesses                                               */
/* ------------------------------------------------------------------ */

function flashcardWeaknesses(snap: DatabaseSnapshot): LearningWeakness[] {
  const out: LearningWeakness[] = [];
  for (const d of deckSignals(snap)) {
    if (d.shakyCards.length < 3) continue;
    out.push({
      id: `weak-deck-${d.deckId}`,
      kind: "flashcards",
      sourceType: "deck",
      sourceId: d.deckId,
      title: d.name,
      evidence: `${plural(d.shakyCards.length, "card")} in ${d.name} keep tripping you up.`,
      severity: Math.min(75, 25 + d.shakyCards.length * 8),
      estimatedMinutes: estFlashcardMinutes(d.shakyCards.length),
      action: { label: "Review those cards", href: `/study/${d.deckId}` },
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Language weaknesses                                                */
/* ------------------------------------------------------------------ */

function languageWeaknesses(snap: DatabaseSnapshot): LearningWeakness[] {
  const out: LearningWeakness[] = [];
  for (const l of languageSignals(snap)) {
    const base = `/languages/${l.profileId}`;

    if (l.slippingWords.length >= 3) {
      out.push({
        id: `weak-lang-${l.profileId}-vocab`,
        kind: "language-vocab",
        sourceType: "language",
        sourceId: l.profileId,
        title: `${l.name} vocabulary`,
        evidence: `${plural(l.slippingWords.length, "word")} in ${l.name} keep slipping — you've rated them "Again" repeatedly.`,
        severity: Math.min(70, 20 + l.slippingWords.length * 8),
        estimatedMinutes: estVocabMinutes(l.slippingWords.length),
        action: { label: "Practise those words", href: `${base}/practice/review` },
      });
    }

    const listening = skillProgress(snap, l.profileId, "listening");
    if (listening.score !== null && listening.score < 60 && listening.attempts >= 4) {
      out.push({
        id: `weak-lang-${l.profileId}-listening`,
        kind: "language-skill",
        sourceType: "language",
        sourceId: l.profileId,
        title: `${l.name} listening`,
        evidence: `Your ${l.name} listening exercises have been about ${listening.score}% accurate lately.`,
        severity: 70 - listening.score,
        estimatedMinutes: 6,
        action: {
          label: "Listening practice",
          href: `${base}/practice/listening`,
        },
      });
    }

    const lang = getLanguage(l.languageId);
    if (lang?.tonal) {
      const speaking = skillProgress(snap, l.profileId, "listening");
      // tone misses show up as listening/speaking review failures — only flag
      // when there is a measured signal, never for pronunciation itself
      void speaking;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */

/** All current weaknesses, most severe first. */
export function detectWeaknesses(snap: DatabaseSnapshot): LearningWeakness[] {
  return [
    ...quizWeaknesses(snap),
    ...flashcardWeaknesses(snap),
    ...languageWeaknesses(snap),
  ].sort((a, b) => b.severity - a.severity);
}

/** The single most important weakness, or null when there's no real evidence. */
export function biggestWeakness(snap: DatabaseSnapshot): LearningWeakness | null {
  return detectWeaknesses(snap)[0] ?? null;
}
