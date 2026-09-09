import type { PracticeMode } from "@/lib/language/types";

export const MODE_LABEL: Record<PracticeMode, string> = {
  learn: "Learn new words",
  review: "Spaced review",
  listening: "Listening practice",
  speaking: "Speaking practice",
  shadowing: "Listen & Repeat",
  reading: "Reading",
  writing: "Writing",
  characters: "Learn characters",
  tones: "Tone practice",
  conversation: "Conversation practice",
};

export const MODE_ICON: Record<PracticeMode, string> = {
  learn: "✨",
  review: "🔁",
  listening: "🎧",
  speaking: "🗣️",
  shadowing: "🎙️",
  reading: "📖",
  writing: "✍️",
  characters: "汉",
  tones: "〰️",
  conversation: "💬",
};

export const MODE_BLURB: Record<PracticeMode, string> = {
  learn: "Meet new vocabulary with audio and examples.",
  review: "Words come back exactly when you're about to forget them.",
  listening: "Hear the language and prove you understood it.",
  speaking: "Say words aloud and record yourself.",
  shadowing: "Hear a sentence, then repeat it back.",
  reading: "Short passages — tap any word for its meaning.",
  writing: "Translate, fill blanks, and arrange sentences.",
  characters: "Study characters, components, and example words.",
  tones: "Train your ear for the five Mandarin tones.",
  conversation: "Use what you've learned in realistic situations.",
};
