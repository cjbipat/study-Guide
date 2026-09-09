import type { Language } from "@/lib/language/types";

/**
 * The language catalog. Adding a language is one entry here — nothing in the
 * system is hardcoded to Mandarin. `characterBased` / `romanization` / `tonal`
 * flags switch on the specialised modes.
 */
export const LANGUAGES: Language[] = [
  {
    id: "mandarin",
    name: "Mandarin Chinese",
    nativeName: "中文",
    flag: "🇨🇳",
    speechLang: "zh-CN",
    characterBased: true,
    romanization: "pinyin",
    tonal: true,
  },
  {
    id: "spanish",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    speechLang: "es-ES",
    characterBased: false,
    romanization: null,
    tonal: false,
  },
  {
    id: "japanese",
    name: "Japanese",
    nativeName: "日本語",
    flag: "🇯🇵",
    speechLang: "ja-JP",
    characterBased: true,
    romanization: "romaji",
    tonal: false,
  },
  {
    id: "korean",
    name: "Korean",
    nativeName: "한국어",
    flag: "🇰🇷",
    speechLang: "ko-KR",
    characterBased: false,
    romanization: "romaja",
    tonal: false,
  },
  {
    id: "french",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    speechLang: "fr-FR",
    characterBased: false,
    romanization: null,
    tonal: false,
  },
  {
    id: "german",
    name: "German",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    speechLang: "de-DE",
    characterBased: false,
    romanization: null,
    tonal: false,
  },
  {
    id: "italian",
    name: "Italian",
    nativeName: "Italiano",
    flag: "🇮🇹",
    speechLang: "it-IT",
    characterBased: false,
    romanization: null,
    tonal: false,
  },
  {
    id: "portuguese",
    name: "Portuguese",
    nativeName: "Português",
    flag: "🇵🇹",
    speechLang: "pt-PT",
    characterBased: false,
    romanization: null,
    tonal: false,
  },
];

export function getLanguage(id: string): Language | undefined {
  return LANGUAGES.find((l) => l.id === id);
}

export const LEVELS = [
  {
    id: "complete-beginner",
    label: "Complete Beginner",
    blurb: "I'm starting from scratch.",
  },
  {
    id: "beginner",
    label: "Beginner",
    blurb: "I know some basic words and phrases.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    blurb: "I can understand and communicate in everyday situations.",
  },
  {
    id: "advanced",
    label: "Advanced",
    blurb: "I want to improve fluency and mastery.",
  },
] as const;

export const GOALS = [
  { id: "travel", label: "Travel", blurb: "Learn useful everyday communication.", icon: "✈️" },
  { id: "conversation", label: "Conversation", blurb: "Speak naturally with other people.", icon: "💬" },
  { id: "school", label: "School", blurb: "Support classes and academic learning.", icon: "🎓" },
  { id: "career", label: "Career", blurb: "Use the language professionally.", icon: "💼" },
  { id: "family", label: "Family", blurb: "Communicate with family and heritage speakers.", icon: "🏡" },
  { id: "fluency", label: "Fluency", blurb: "Build long-term mastery.", icon: "🌟" },
  { id: "custom", label: "Custom Goal", blurb: "Tell us what you're aiming for.", icon: "✏️" },
] as const;

export const DAILY_MINUTES = [5, 10, 15, 30, 60] as const;
