/**
 * Language intelligence — service seams.
 *
 *   UI  →  LanguageService  →  provider interface  →  (future) AI provider
 *
 * None of these are wired to an AI provider yet. The interfaces exist so a
 * `LanguageContentGenerator`, `TranslationProvider`, `GrammarFeedbackProvider`,
 * or `ConversationProvider` can be added later behind `getXxx()` without the UI
 * changing. Today, content comes from the local seed set (`lib/language/seed.ts`).
 */

import type {
  LanguageLevel,
  LanguageVocabularyItem,
  ReadingPassage,
  ShadowingLine,
} from "@/lib/language/types";
import {
  SEED_READING,
  SEED_SHADOWING,
  seedVocabForProfile,
} from "@/lib/language/seed";

/* ---- Content generation (future AI) ------------------------------ */

export interface LanguageContentGenerator {
  readonly id: string;
  readonly available: boolean;
  generateVocab(args: {
    languageId: string;
    level: LanguageLevel;
    topic?: string;
    count: number;
  }): Promise<Omit<LanguageVocabularyItem, "id" | "profileId" | "createdAt" | "ease" | "intervalDays" | "repetitions" | "dueAt" | "lastReviewedAt" | "lapses">[]>;
}

class UnavailableContentGenerator implements LanguageContentGenerator {
  readonly id = "unavailable";
  readonly available = false;
  async generateVocab() {
    throw new Error("Vocabulary generation is not connected yet.");
    return [];
  }
}

let contentGen: LanguageContentGenerator | null = null;
export function getContentGenerator(): LanguageContentGenerator {
  if (!contentGen) contentGen = new UnavailableContentGenerator();
  return contentGen;
}

/* ---- Translation (future) --------------------------------------- */

export interface TranslationProvider {
  readonly id: string;
  readonly available: boolean;
  translate(text: string, from: string, to: string): Promise<string | null>;
}

class UnavailableTranslationProvider implements TranslationProvider {
  readonly id = "unavailable";
  readonly available = false;
  async translate() {
    return null;
  }
}

let translation: TranslationProvider | null = null;
export function getTranslationProvider(): TranslationProvider {
  if (!translation) translation = new UnavailableTranslationProvider();
  return translation;
}

/* ---- Local content library ------------------------------------- */

export const LanguageContent = {
  seedVocab(profileId: string, languageId: string, level: LanguageLevel) {
    return seedVocabForProfile(profileId, languageId, level);
  },
  reading(languageId: string, level: LanguageLevel): ReadingPassage[] {
    const all = SEED_READING.filter((p) => p.languageId === languageId);
    const forLevel = all.filter((p) => p.level === level);
    return forLevel.length ? forLevel : all;
  },
  shadowing(languageId: string, level: LanguageLevel): ShadowingLine[] {
    const all = SEED_SHADOWING.filter((p) => p.languageId === languageId);
    const forLevel = all.filter((p) => p.level === level);
    return forLevel.length ? forLevel : all;
  },
};
