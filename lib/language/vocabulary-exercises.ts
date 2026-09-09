/**
 * VocabularyExerciseGenerator
 *
 * Turns a vocabulary item into a concrete recall exercise, rotating the
 * *direction* of practice so a word is never trained one way only. Selection is
 * deterministic — driven by familiarity, past mistakes, the learner's level, and
 * position in the queue — not random repetition.
 *
 * Active-recall rule baked in: an exercise's `question` and `options` NEVER
 * contain the English meaning of a "what does it mean?" prompt. Meanings live
 * only in `reveal`, shown after the learner attempts or taps "Show Answer".
 */

import type {
  LanguageLevel,
  LanguageVocabularyItem,
} from "@/lib/language/types";

export type VocabularyExerciseType =
  | "target-to-meaning"
  | "meaning-to-target"
  | "audio-to-meaning"
  | "audio-to-target"
  | "sentence-use"
  | "context-cloze";

export type VocabularyExerciseFormat = "reveal" | "choice";

export interface VocabularyExercise {
  id: string;
  item: LanguageVocabularyItem;
  type: VocabularyExerciseType;
  format: VocabularyExerciseFormat;
  skill: "vocabulary" | "listening";
  /** short section label */
  tag: string;
  /** the question line — never contains the answer */
  question: string;
  /** audio-first exercises auto-play and lead with the speaker */
  audioFirst: boolean;
  /** the text to speak for audio-first types (usually the target word) */
  audioText: string;
  /** normalized-compared accepted typed answers (reveal types) */
  acceptedAnswers: string[];
  /** what a typed answer represents */
  typeExpects: "meaning" | "target" | null;
  /** MC options (choice types) — never an English meaning */
  options: string[] | null;
  /** correct option (choice types) */
  answer: string | null;
  /** revealed only after an attempt / "Show Answer" */
  reveal: {
    target: string;
    pronunciation: string;
    translation: string;
    example?: string;
    examplePronunciation?: string;
    exampleTranslation?: string;
  };
}

export interface GenerateContext {
  level: LanguageLevel;
  /** ids the learner recently missed — re-anchor the meaning for these */
  recentMistakes?: Set<string>;
}

/* ------------------------------------------------------------------ */
/*  answer normalization / accepted alternates                         */
/* ------------------------------------------------------------------ */

const TONE_MAP: Record<string, string> = {
  ā: "a", á: "a", ǎ: "a", à: "a",
  ē: "e", é: "e", ě: "e", è: "e",
  ī: "i", í: "i", ǐ: "i", ì: "i",
  ō: "o", ó: "o", ǒ: "o", ò: "o",
  ū: "u", ú: "u", ǔ: "u", ù: "u",
  ǖ: "u", ǘ: "u", ǚ: "u", ǜ: "u", ü: "u",
};

export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, (c) => TONE_MAP[c] ?? c)
    .replace(/[.,!?;:"'“”‘’()\[\]{}·・，。！？、\s　-]/g, "")
    .replace(/^to /, "");
}

/** primary translation + reasonable deterministic alternates */
export function acceptedMeanings(item: LanguageVocabularyItem): string[] {
  const raw = item.translation;
  const parts = raw
    .split(/[/,;]|\bor\b/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const out = new Set<string>();
  for (const p of [raw, ...parts]) {
    out.add(p);
    // "Chinese (language)" -> "Chinese"
    const noParen = p.replace(/\([^)]*\)/g, "").trim();
    if (noParen) out.add(noParen);
    // "to eat" -> "eat"
    if (/^to /i.test(p)) out.add(p.replace(/^to /i, "").trim());
  }
  return [...out].filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  deterministic RNG                                                  */
/* ------------------------------------------------------------------ */

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededPick<T>(arr: T[], rng: () => number, n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/* ------------------------------------------------------------------ */
/*  Generator                                                          */
/* ------------------------------------------------------------------ */

export class VocabularyExerciseGenerator {
  private hasCloze(item: LanguageVocabularyItem): boolean {
    return (
      !!item.exampleSentence &&
      item.exampleSentence.includes(item.target) &&
      item.target.length >= 1
    );
  }

  private isAdvanced(level: LanguageLevel): boolean {
    return level === "intermediate" || level === "advanced";
  }

  /** deterministic exercise type for `item` at `position` in the queue */
  pickType(
    item: LanguageVocabularyItem,
    ctx: GenerateContext,
    position: number,
    pool: LanguageVocabularyItem[],
  ): VocabularyExerciseType {
    const reps = item.repetitions;
    const advanced = this.isAdvanced(ctx.level);
    const slipped = (ctx.recentMistakes?.has(item.id) ?? false) || item.lapses > 0;

    // Re-anchor the meaning right after a slip.
    if (slipped && reps <= 3) return "target-to-meaning";

    let ladder: VocabularyExerciseType[];
    if (reps <= 1) ladder = ["target-to-meaning"];
    else if (reps === 2) ladder = ["meaning-to-target", "target-to-meaning"];
    else if (reps === 3)
      ladder = ["audio-to-meaning", "meaning-to-target", "target-to-meaning"];
    else if (reps === 4)
      ladder = ["audio-to-target", "audio-to-meaning", "meaning-to-target"];
    else
      ladder = advanced
        ? ["context-cloze", "sentence-use", "audio-to-target", "target-to-meaning"]
        : ["audio-to-target", "context-cloze", "meaning-to-target", "target-to-meaning"];

    // Advanced learners meet context sooner.
    if (advanced && reps >= 3 && this.hasCloze(item)) {
      ladder = ["context-cloze", ...ladder.filter((t) => t !== "context-cloze")];
    }

    const rng = mulberry32(hashSeed(item.id) ^ (position * 2654435761));
    let type = ladder[(reps + position + Math.floor(rng() * 3)) % ladder.length];

    // Fall back when a context type can't be built honestly.
    const sentenceDonors = pool.filter(
      (v) => v.exampleSentence && v.id !== item.id,
    ).length;
    if (type === "context-cloze" && !this.hasCloze(item)) {
      type = advanced ? "audio-to-target" : "target-to-meaning";
    }
    if (
      type === "sentence-use" &&
      (!item.exampleSentence || sentenceDonors < 3)
    ) {
      type = this.hasCloze(item) ? "context-cloze" : "audio-to-target";
    }
    return type;
  }

  build(
    item: LanguageVocabularyItem,
    type: VocabularyExerciseType,
    pool: LanguageVocabularyItem[],
    position: number,
  ): VocabularyExercise {
    const rng = mulberry32(hashSeed(item.id + ":" + type) ^ (position * 40503));
    const reveal = {
      target: item.target,
      pronunciation: item.pronunciation,
      translation: item.translation,
      example: item.exampleSentence,
      examplePronunciation: item.examplePronunciation,
      exampleTranslation: item.exampleTranslation,
    };
    const others = pool.filter((v) => v.id !== item.id);

    const base = {
      id: `${item.id}:${type}:${position}`,
      item,
      type,
      reveal,
      audioText: item.target,
    };

    switch (type) {
      case "target-to-meaning":
        return {
          ...base,
          format: "reveal",
          skill: "vocabulary",
          tag: "Quick check",
          question: `What does ${item.target} mean?`,
          audioFirst: false,
          acceptedAnswers: acceptedMeanings(item),
          typeExpects: "meaning",
          options: null,
          answer: null,
        };

      case "meaning-to-target":
        return {
          ...base,
          format: "reveal",
          skill: "vocabulary",
          tag: "Produce it",
          question: `How do you say “${item.translation}”?`,
          audioFirst: false,
          acceptedAnswers: [
            item.target,
            item.pronunciation,
            normalizeAnswer(item.pronunciation),
          ],
          typeExpects: "target",
          options: null,
          answer: null,
        };

      case "audio-to-meaning":
        return {
          ...base,
          format: "reveal",
          skill: "listening",
          tag: "Listen & recall",
          question: "What does this word mean?",
          audioFirst: true,
          acceptedAnswers: acceptedMeanings(item),
          typeExpects: "meaning",
          options: null,
          answer: null,
        };

      case "audio-to-target": {
        const distractors = seededPick(others.map((v) => v.target), rng, 3);
        return {
          ...base,
          format: "choice",
          skill: "listening",
          tag: "Which word?",
          question: "Which word did you hear?",
          audioFirst: true,
          acceptedAnswers: [],
          typeExpects: null,
          options: seededPick([item.target, ...distractors], rng, 4),
          answer: item.target,
        };
      }

      case "context-cloze": {
        const sentence = item.exampleSentence ?? "";
        const blanked = sentence.replace(item.target, "＿＿");
        const distractors = seededPick(others.map((v) => v.target), rng, 3);
        return {
          ...base,
          format: "choice",
          skill: "vocabulary",
          tag: "Fill the blank",
          question: blanked,
          audioFirst: false,
          acceptedAnswers: [],
          typeExpects: null,
          options: seededPick([item.target, ...distractors], rng, 4),
          answer: item.target,
        };
      }

      case "sentence-use": {
        const blank = (v: LanguageVocabularyItem) =>
          (v.exampleSentence ?? "").replace(v.target, "＿＿");
        const donors = seededPick(
          others.filter((v) => v.exampleSentence),
          rng,
          3,
        );
        const correct = blank(item);
        return {
          ...base,
          format: "choice",
          skill: "vocabulary",
          tag: "Use it in context",
          question: `Which sentence needs the word ${item.target}?`,
          audioFirst: false,
          acceptedAnswers: [],
          typeExpects: null,
          options: seededPick([correct, ...donors.map(blank)], rng, 4),
          answer: correct,
        };
      }
    }
  }

  generate(
    item: LanguageVocabularyItem,
    pool: LanguageVocabularyItem[],
    ctx: GenerateContext,
  ): VocabularyExercise {
    return this.build(item, this.pickType(item, ctx, 0, pool), pool, 0);
  }

  generateSet(
    items: LanguageVocabularyItem[],
    pool: LanguageVocabularyItem[],
    ctx: GenerateContext,
  ): VocabularyExercise[] {
    const out: VocabularyExercise[] = [];
    let prevType: VocabularyExerciseType | null = null;
    items.forEach((item, i) => {
      let type = this.pickType(item, ctx, i, pool);
      // avoid three-in-a-row of the same direction
      if (type === prevType && out.length >= 1) {
        type = this.pickType(item, ctx, i + 1, pool);
      }
      out.push(this.build(item, type, pool, i));
      prevType = type;
    });
    return out;
  }
}

let generator: VocabularyExerciseGenerator | null = null;
export function getVocabularyExerciseGenerator(): VocabularyExerciseGenerator {
  if (!generator) generator = new VocabularyExerciseGenerator();
  return generator;
}
