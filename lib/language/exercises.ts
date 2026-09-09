/**
 * Builds the queue of concrete exercises for a practice mode or a full session.
 * Pure — no React.
 *
 * Vocabulary recall goes through `VocabularyExerciseGenerator`, which rotates the
 * *direction* of practice (target→meaning, meaning→target, audio→…, context…)
 * deterministically and never leaks the answer into the prompt.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type {
  LanguageProfile,
  LanguageSkill,
  LanguageVocabularyItem,
  PracticeMode,
  ReadingPassage,
  ShadowingLine,
} from "@/lib/language/types";
import { getLanguage } from "@/lib/language/catalog";
import { LanguageContent } from "@/lib/language/services";
import { getScheduler } from "@/lib/language/scheduler";
import { dueVocab, newVocab, vocabForProfile } from "@/lib/language/store";
import { reviewsForProfile } from "@/lib/language/progress";
import {
  getVocabularyExerciseGenerator,
  type GenerateContext,
  type VocabularyExercise,
} from "@/lib/language/vocabulary-exercises";
import { shuffle } from "@/lib/utils";
import { TONES } from "@/lib/language/tones";

export type Exercise =
  | { kind: "learn"; skill: "vocabulary"; item: LanguageVocabularyItem }
  | {
      kind: "vocab";
      skill: LanguageSkill;
      item: LanguageVocabularyItem;
      exercise: VocabularyExercise;
    }
  | {
      kind: "listening-type";
      skill: "listening";
      item: LanguageVocabularyItem;
      audioText: string;
      answer: string;
    }
  | { kind: "shadowing"; skill: "speaking"; line: ShadowingLine }
  | { kind: "speaking"; skill: "speaking"; item: LanguageVocabularyItem }
  | { kind: "reading"; skill: "reading"; passage: ReadingPassage }
  | {
      kind: "writing-translate";
      skill: "writing";
      item: LanguageVocabularyItem;
      answer: string;
      prompt: string;
    }
  | {
      kind: "writing-order";
      skill: "writing";
      item: LanguageVocabularyItem;
      tokens: string[];
      answer: string;
      prompt: string;
    }
  | {
      kind: "character";
      skill: "reading";
      char: string;
      item: LanguageVocabularyItem;
    }
  | {
      kind: "tone";
      skill: "pronunciation";
      syllable: string;
      audioText: string;
      answer: number;
    };

export interface BuildArgs {
  snap: DatabaseSnapshot;
  profile: LanguageProfile;
  mode: PracticeMode;
  limit?: number;
}

/** vocabIds the learner has recently missed — used to re-anchor meaning */
function recentMistakes(snap: DatabaseSnapshot, profileId: string): Set<string> {
  const out = new Set<string>();
  for (const r of reviewsForProfile(snap, profileId).slice(0, 30)) {
    if (!r.correct && r.vocabId) out.add(r.vocabId);
  }
  return out;
}

export function buildExercises({ snap, profile, mode, limit }: BuildArgs): Exercise[] {
  const lang = getLanguage(profile.languageId);
  const all = vocabForProfile(snap, profile.id);
  const cap = limit ?? 12;
  const gen = getVocabularyExerciseGenerator();
  const ctx: GenerateContext = {
    level: profile.level,
    recentMistakes: recentMistakes(snap, profile.id),
  };

  switch (mode) {
    case "learn": {
      const fresh = newVocab(snap, profile.id, cap);
      return fresh.map((item) => ({ kind: "learn", skill: "vocabulary", item }));
    }

    case "review": {
      let items = dueVocab(snap, profile.id, cap);
      if (items.length === 0) {
        items = all
          .filter((v) => v.repetitions > 0 || v.lastReviewedAt !== null)
          .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
          .slice(0, Math.min(cap, 8));
      }
      return gen.generateSet(items, all, ctx).map((exercise) => ({
        kind: "vocab" as const,
        skill: exercise.skill,
        item: exercise.item,
        exercise,
      }));
    }

    case "listening": {
      const items = shuffle(all).slice(0, cap);
      return items.map((item, i): Exercise => {
        if (i % 3 === 2) {
          return {
            kind: "listening-type",
            skill: "listening",
            item,
            audioText: item.target,
            answer: item.target,
          };
        }
        const type = i % 2 === 0 ? "audio-to-target" : "audio-to-meaning";
        const exercise = gen.build(item, type, all, i);
        return { kind: "vocab", skill: "listening", item, exercise };
      });
    }

    case "speaking": {
      const items = shuffle(all).slice(0, Math.min(cap, 8));
      return items.map((item) => ({ kind: "speaking", skill: "speaking", item }));
    }

    case "shadowing": {
      const lines = LanguageContent.shadowing(profile.languageId, profile.level);
      return shuffle(lines)
        .slice(0, Math.min(cap, 5))
        .map((line) => ({ kind: "shadowing", skill: "speaking", line }));
    }

    case "reading": {
      const passages = LanguageContent.reading(profile.languageId, profile.level);
      return passages
        .slice(0, 2)
        .map((passage) => ({ kind: "reading", skill: "reading", passage }));
    }

    case "writing": {
      const items = shuffle(all.filter((v) => v.exampleSentence)).slice(
        0,
        Math.min(cap, 8),
      );
      return items.map((item, i): Exercise => {
        if (i % 2 === 1 && item.exampleSentence) {
          const tokens =
            item.languageId === "mandarin"
              ? Array.from(item.exampleSentence.replace(/[，。！？、]/g, ""))
              : item.exampleSentence.replace(/[.,!?]/g, "").split(/\s+/);
          return {
            kind: "writing-order",
            skill: "writing",
            item,
            tokens: shuffle(tokens),
            answer:
              item.languageId === "mandarin" ? tokens.join("") : tokens.join(" "),
            prompt: "Arrange the words into the correct sentence.",
          };
        }
        return {
          kind: "writing-translate",
          skill: "writing",
          item,
          answer: item.target,
          prompt: `Translate: “${item.translation}”`,
        };
      });
    }

    case "characters": {
      if (!lang?.characterBased) return [];
      const chars = new Set<string>();
      const out: Exercise[] = [];
      for (const item of all) {
        for (const ch of Array.from(item.target)) {
          if (/[一-鿿぀-ヿ]/.test(ch) && !chars.has(ch)) {
            chars.add(ch);
            out.push({ kind: "character", skill: "reading", char: ch, item });
          }
        }
        if (out.length >= cap) break;
      }
      return out;
    }

    case "tones": {
      if (!lang?.tonal) return [];
      const syllables = ["mā/má/mǎ/mà/ma", "bā/bá/bǎ/bà/ba", "hē/hé/hě/hè/he", "yī/yí/yǐ/yì/yi"];
      const out: Exercise[] = [];
      for (let i = 0; i < Math.min(cap, 8); i++) {
        const set = syllables[i % syllables.length].split("/");
        const toneIdx = i % 5;
        out.push({
          kind: "tone",
          skill: "pronunciation",
          syllable: set[toneIdx],
          audioText: set[toneIdx],
          answer: TONES[toneIdx].n,
        });
      }
      return out;
    }

    default:
      return [];
  }
}

export function skillOf(mode: PracticeMode): LanguageSkill {
  const map: Record<PracticeMode, LanguageSkill> = {
    learn: "vocabulary",
    review: "vocabulary",
    listening: "listening",
    speaking: "speaking",
    shadowing: "speaking",
    reading: "reading",
    writing: "writing",
    characters: "reading",
    tones: "pronunciation",
    conversation: "speaking",
  };
  return map[mode];
}
