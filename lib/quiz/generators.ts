/**
 * Quiz generators — one per source type, all emitting the same `QuizQuestion[]`.
 *
 * `generateQuizQuestions()` is the single entry point the UI calls; it delegates
 * by source type. Every generator is honest: it only builds questions from real
 * content, and reports `{ ok: false }` when it can't.
 */

import type { DatabaseSnapshot, StudyMaterial } from "@/lib/types";
import type {
  Quiz,
  QuizGenerationResult,
  QuizQuestion,
  QuizQuestionType,
  QuizRecipe,
  QuizSource,
} from "@/lib/quiz/types";
import {
  StudyMaterialService,
  cleanMaterialText,
  clozeCards,
  extractPairs,
} from "@/lib/materials/processor";
import { scenariosForLanguage } from "@/lib/language/conversation-content";
import { shuffle, uid } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  shared helpers                                                     */
/* ------------------------------------------------------------------ */

function firstSentence(s: string): string {
  const m = s.match(/^(.*?[.!?])(\s|$)/);
  return (m ? m[1] : s).trim();
}

function distractors(pool: string[], correct: string, n: number): string[] {
  const seen = new Set([correct.toLowerCase()]);
  const out: string[] = [];
  for (const x of shuffle(pool)) {
    if (seen.has(x.toLowerCase())) continue;
    seen.add(x.toLowerCase());
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
}

/** rotate through the requested types. Matching (which covers several items in
 *  one question) appears at most once, at the front. */
function typeSequence(recipe: QuizRecipe, count: number): QuizQuestionType[] {
  const requested = recipe.types.length
    ? recipe.types
    : (["multiple-choice", "true-false", "short-answer"] as QuizQuestionType[]);
  const wantsMatching = requested.includes("matching");
  const rotating = requested.filter((t) => t !== "matching");
  const pool = rotating.length ? rotating : (["multiple-choice"] as QuizQuestionType[]);
  const seq: QuizQuestionType[] = [];
  const offset = wantsMatching ? 1 : 0;
  if (wantsMatching) seq.push("matching");
  for (let i = offset; i < count; i++) seq.push(pool[(i - offset) % pool.length]);
  return seq;
}

/* ------------------------------------------------------------------ */
/*  Material                                                           */
/* ------------------------------------------------------------------ */

/** nearest markdown heading above where `term` first appears — a real topic */
function topicForTerm(text: string, term: string): string | undefined {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l.includes(term));
  if (at < 0) return undefined;
  for (let i = at; i >= 0; i--) {
    const h = lines[i].match(/^\s*#{1,6}\s+(.{2,60})\s*$/);
    if (h) return h[1].trim();
  }
  return undefined;
}

export function generateMaterialQuiz(
  material: StudyMaterial,
  recipe: QuizRecipe,
): QuizGenerationResult {
  if (!StudyMaterialService.canGenerate(material)) {
    return {
      ok: false,
      reason: "no-text",
      message:
        "We can't create questions from this material yet because its text hasn't been extracted.",
    };
  }

  const text = cleanMaterialText(material.extractedText as string);
  const pairs = extractPairs(text, material.kind);
  const terms = pairs.map((p) => p.term);
  const cloze = clozeCards(text, recipe.size * 2);

  if (pairs.length < 2 && cloze.length < 3) {
    return {
      ok: false,
      reason: "not-enough-content",
      message:
        "This material doesn't have enough clear term/definition structure to build a quiz. Try notes with headings or a term/definition list — or add questions manually.",
    };
  }

  const questions: QuizQuestion[] = [];
  const seq = typeSequence(recipe, recipe.size);
  let pi = 0;
  let ci = 0;

  for (const want of seq) {
    if (questions.length >= recipe.size) break;
    const pair = pairs[pi % Math.max(pairs.length, 1)];

    if (want === "matching") {
      if (pairs.length >= 3) {
        questions.push({
          id: uid("q"),
          type: "matching",
          prompt: "Match each term to its definition.",
          pairs: pairs.slice(0, 5).map((p) => ({
            left: p.term,
            right: firstSentence(p.definition),
          })),
        });
        pi += Math.min(pairs.length, 5);
      }
      continue;
    }

    if ((want === "multiple-choice" || want === "true-false") && pair && terms.length >= 4) {
      pi++;
      const topic = topicForTerm(text, pair.term);
      if (want === "multiple-choice") {
        const opts = shuffle([
          pair.term,
          ...distractors(terms, pair.term, 3),
        ]);
        questions.push({
          id: uid("q"),
          type: "multiple-choice",
          prompt: `Which term matches this description?\n\n"${firstSentence(pair.definition)}"`,
          options: opts,
          answer: pair.term,
          explanation: `${pair.term}: ${pair.definition}`,
          topic,
        });
      } else {
        const swap = Math.random() < 0.5;
        const shown = swap
          ? pairs[(pi + 1) % pairs.length].definition
          : pair.definition;
        questions.push({
          id: uid("q"),
          type: "true-false",
          prompt: `True or false — "${pair.term}" means: ${firstSentence(shown)}`,
          answer: swap ? "False" : "True",
          explanation: swap
            ? `False. ${pair.term}: ${pair.definition}`
            : `True. ${pair.term}: ${pair.definition}`,
          topic,
        });
      }
      continue;
    }

    if (want === "short-answer" && pair) {
      pi++;
      questions.push({
        id: uid("q"),
        type: "short-answer",
        prompt: `In your own words, define: ${pair.term}`,
        acceptedAnswers: [
          pair.definition,
          firstSentence(pair.definition),
        ],
        explanation: `Reference answer — ${pair.definition}`,
        topic: topicForTerm(text, pair.term),
      });
      continue;
    }

    // fill-blank (or a fallback for any type we couldn't satisfy)
    const c = cloze[ci++];
    if (c) {
      questions.push({
        id: uid("q"),
        type: "fill-blank",
        prompt: c.question.replace(/^Fill in the blank:\s*/i, "").replace(/_____/g, "____"),
        acceptedAnswers: [c.answer],
      });
    } else if (pair) {
      pi++;
      questions.push({
        id: uid("q"),
        type: "short-answer",
        prompt: `In your own words, define: ${pair.term}`,
        acceptedAnswers: [pair.definition, firstSentence(pair.definition)],
        explanation: `Reference answer — ${pair.definition}`,
        topic: topicForTerm(text, pair.term),
      });
    }
  }

  if (questions.length === 0) {
    return {
      ok: false,
      reason: "not-enough-content",
      message:
        "We couldn't turn this material into questions. Add questions manually, or try a material with clearer structure.",
    };
  }

  const note =
    questions.length < recipe.size
      ? `We built ${questions.length} question${questions.length === 1 ? "" : "s"} from this material (you asked for ${recipe.size}).`
      : undefined;

  return { ok: true, questions: questions.slice(0, recipe.size), note };
}

/* ------------------------------------------------------------------ */
/*  Deck                                                               */
/* ------------------------------------------------------------------ */

export function generateDeckQuiz(
  snap: DatabaseSnapshot,
  deckId: string,
  recipe: QuizRecipe,
): QuizGenerationResult {
  const cards = snap.cards.filter((c) => c.deckId === deckId);
  if (cards.length < 3) {
    return {
      ok: false,
      reason: "not-enough-content",
      message:
        "This deck needs at least 3 cards to build a quiz. Add more cards first.",
    };
  }

  const answers = cards.map((c) => c.answer);
  const chosen = shuffle(cards).slice(0, recipe.size);
  const seq = typeSequence(recipe, chosen.length);
  const questions: QuizQuestion[] = [];
  const matchBuffer = shuffle(cards).slice(0, 5);

  chosen.forEach((card, i) => {
    const want = seq[i];
    const ref = { kind: "card" as const, id: card.id };
    const shortAnswer = firstSentence(card.answer);

    if (want === "matching") {
      // one matching question covers several cards
      if (!questions.some((q) => q.type === "matching")) {
        questions.push({
          id: uid("q"),
          type: "matching",
          prompt: "Match each card to its answer.",
          pairs: matchBuffer.map((c) => ({
            left: c.question,
            right: firstSentence(c.answer),
          })),
        });
      } else {
        // fall back to MC for the extra ones
        questions.push(mcFromCard(card, answers, ref));
      }
      return;
    }
    if (want === "multiple-choice" && answers.length >= 4) {
      questions.push(mcFromCard(card, answers, ref));
      return;
    }
    if (want === "true-false") {
      const swap = Math.random() < 0.5;
      const other = chosen[(i + 1) % chosen.length];
      const shown = swap ? firstSentence(other.answer) : shortAnswer;
      questions.push({
        id: uid("q"),
        type: "true-false",
        prompt: `True or false — the answer to "${card.question}" is: ${shown}`,
        answer: swap ? "False" : "True",
        explanation: `${card.question} → ${card.answer}`,
        ref,
      });
      return;
    }
    if (want === "fill-blank") {
      const words = card.answer.split(/\s+/);
      const idx = words.findIndex((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length >= 5);
      if (idx >= 0) {
        const target = words[idx].replace(/[^\p{L}\p{N}-]/gu, "");
        questions.push({
          id: uid("q"),
          type: "fill-blank",
          prompt: `${card.question}\n\n${words.map((w, wi) => (wi === idx ? "____" : w)).join(" ")}`,
          acceptedAnswers: [target],
          explanation: `${card.question} → ${card.answer}`,
          ref,
        });
        return;
      }
      // no good blank → short answer
    }
    // short-answer (default)
    questions.push({
      id: uid("q"),
      type: "short-answer",
      prompt: card.question,
      acceptedAnswers: [card.answer, shortAnswer],
      explanation: `Reference answer — ${card.answer}`,
      ref,
    });
  });

  return { ok: true, questions: questions.slice(0, recipe.size) };
}

function mcFromCard(
  card: { id: string; question: string; answer: string },
  answers: string[],
  ref: { kind: "card"; id: string },
): QuizQuestion {
  const correct = firstSentence(card.answer);
  const opts = shuffle([
    correct,
    ...distractors(answers.map(firstSentence), correct, 3),
  ]);
  return {
    id: uid("q"),
    type: "multiple-choice",
    prompt: card.question,
    options: opts,
    answer: correct,
    explanation:
      correct === card.answer.trim() ? undefined : `Full answer — ${card.answer}`,
    ref,
  };
}

/* ------------------------------------------------------------------ */
/*  Language                                                           */
/* ------------------------------------------------------------------ */

export function generateLanguageQuiz(
  snap: DatabaseSnapshot,
  profileId: string,
  recipe: QuizRecipe,
): QuizGenerationResult {
  const profile = snap.languages.find((p) => p.id === profileId);
  if (!profile) {
    return { ok: false, reason: "not-enough-content", message: "Language not found." };
  }
  const mode = recipe.languageMode ?? "vocabulary";
  const vocab = snap.vocab.filter((v) => v.profileId === profileId);

  if (mode === "conversation") {
    const scenarios = scenariosForLanguage(profile.languageId);
    if (scenarios.length === 0) {
      return {
        ok: false,
        reason: "not-enough-content",
        message: "No conversation scenarios are available for this language yet.",
      };
    }
    const questions: QuizQuestion[] = [];
    for (const sc of shuffle(scenarios)) {
      if (questions.length >= recipe.size) break;
      for (const w of shuffle(sc.vocabulary).slice(0, 3)) {
        if (questions.length >= recipe.size) break;
        const opts = shuffle([
          w.translation,
          ...distractors(
            sc.vocabulary.map((x) => x.translation),
            w.translation,
            3,
          ),
        ]);
        if (opts.length < 2) continue;
        questions.push({
          id: uid("q"),
          type: "multiple-choice",
          prompt: `In "${sc.title}" — what does ${w.target} mean?`,
          options: opts,
          answer: w.translation,
          explanation: w.example
            ? `${w.target} (${w.pronunciation}) — ${w.translation}. e.g. ${w.example}`
            : `${w.target} (${w.pronunciation}) — ${w.translation}`,
          topic: sc.title,
          ref: { kind: "scenario", id: sc.id },
        });
      }
    }
    return questions.length
      ? { ok: true, questions: questions.slice(0, recipe.size) }
      : {
          ok: false,
          reason: "not-enough-content",
          message: "Not enough conversation vocabulary to build a quiz yet.",
        };
  }

  // vocabulary / listening / sentence / reading — all vocab-driven
  if (vocab.length < 4) {
    return {
      ok: false,
      reason: "not-enough-content",
      message:
        "You need at least 4 vocabulary words to build a quiz. Learn some words first.",
    };
  }

  const translations = vocab.map((v) => v.translation);
  const targets = vocab.map((v) => v.target);
  const seq = typeSequence(recipe, recipe.size);
  const questions: QuizQuestion[] = [];
  const pickList = shuffle(vocab).slice(0, recipe.size);
  const matchBuffer = shuffle(vocab).slice(0, 5);

  pickList.forEach((v, i) => {
    const want = seq[i];
    const ref = { kind: "vocab" as const, id: v.id };

    if (want === "matching") {
      if (!questions.some((q) => q.type === "matching")) {
        questions.push({
          id: uid("q"),
          type: "matching",
          prompt: "Match each word to its meaning.",
          pairs: matchBuffer.map((x) => ({ left: x.target, right: x.translation })),
        });
        return;
      }
    }
    if (want === "true-false") {
      const swap = Math.random() < 0.5;
      const other = pickList[(i + 1) % pickList.length];
      questions.push({
        id: uid("q"),
        type: "true-false",
        prompt: `True or false — ${v.target} means "${swap ? other.translation : v.translation}"`,
        answer: swap ? "False" : "True",
        explanation: `${v.target} (${v.pronunciation}) — ${v.translation}`,
        ref,
      });
      return;
    }
    if (want === "short-answer") {
      questions.push({
        id: uid("q"),
        type: "short-answer",
        prompt:
          mode === "sentence"
            ? `Translate into ${langWordFor(profile.languageId)}: "${v.translation}"`
            : `What does ${v.target} mean?`,
        acceptedAnswers:
          mode === "sentence"
            ? [v.target, v.pronunciation]
            : [v.translation, ...v.translation.split(/[/,]/).map((s) => s.trim())],
        explanation: `${v.target} (${v.pronunciation}) — ${v.translation}`,
        ref,
      });
      return;
    }
    if (want === "fill-blank" && v.exampleSentence && v.exampleSentence.includes(v.target)) {
      questions.push({
        id: uid("q"),
        type: "fill-blank",
        prompt: `${v.exampleSentence.replace(v.target, "____")}\n\n(${v.exampleTranslation ?? v.translation})`,
        acceptedAnswers: [v.target, v.pronunciation],
        explanation: `${v.target} (${v.pronunciation}) — ${v.translation}`,
        ref,
      });
      return;
    }
    // multiple-choice (default) — meaning recognition or, for "sentence", production
    if (mode === "sentence") {
      const opts = shuffle([v.target, ...distractors(targets, v.target, 3)]);
      questions.push({
        id: uid("q"),
        type: "multiple-choice",
        prompt: `How do you say "${v.translation}"?`,
        options: opts,
        answer: v.target,
        explanation: `${v.target} (${v.pronunciation}) — ${v.translation}`,
        ref,
      });
    } else {
      const opts = shuffle([
        v.translation,
        ...distractors(translations, v.translation, 3),
      ]);
      questions.push({
        id: uid("q"),
        type: "multiple-choice",
        prompt:
          mode === "listening"
            ? `Listen and choose the meaning of ${v.target}.`
            : `What does ${v.target} mean?`,
        options: opts,
        answer: v.translation,
        explanation: `${v.target} (${v.pronunciation}) — ${v.translation}`,
        ref,
      });
    }
  });

  return { ok: true, questions: questions.slice(0, recipe.size) };
}

function langWordFor(languageId: string): string {
  const map: Record<string, string> = {
    mandarin: "Mandarin",
    spanish: "Spanish",
    japanese: "Japanese",
    french: "French",
    korean: "Korean",
    german: "German",
    italian: "Italian",
    portuguese: "Portuguese",
  };
  return map[languageId] ?? "the target language";
}

/* ------------------------------------------------------------------ */
/*  Facade                                                             */
/* ------------------------------------------------------------------ */

export function generateQuizQuestions(
  snap: DatabaseSnapshot,
  source: QuizSource,
  recipe: QuizRecipe,
): QuizGenerationResult {
  switch (source.type) {
    case "material": {
      const material = snap.materials.find((m) => m.id === source.id);
      if (!material)
        return { ok: false, reason: "no-text", message: "Material not found." };
      return generateMaterialQuiz(material, recipe);
    }
    case "deck":
      return generateDeckQuiz(snap, source.id ?? "", recipe);
    case "language":
      return generateLanguageQuiz(snap, source.id ?? "", recipe);
    case "manual":
      return { ok: true, questions: [] };
  }
}

/** used by "retake — new version": regenerate from the stored recipe */
export function regenerateQuiz(
  snap: DatabaseSnapshot,
  quiz: Quiz,
): QuizGenerationResult {
  if (!quiz.recipe) return { ok: true, questions: quiz.questions };
  return generateQuizQuestions(snap, quiz.source, quiz.recipe);
}
