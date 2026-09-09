import type { LanguageSkill } from "@/lib/language/types";

export const SKILL_META: Record<
  LanguageSkill,
  { label: string; icon: string; gradient: string; text: string; bar: string }
> = {
  vocabulary: {
    label: "Vocabulary",
    icon: "🧠",
    gradient: "from-violet-500 to-fuchsia-500",
    text: "text-violet-500",
    bar: "from-violet-500 to-fuchsia-500",
  },
  listening: {
    label: "Listening",
    icon: "🎧",
    gradient: "from-blue-500 to-cyan-500",
    text: "text-blue-500",
    bar: "from-blue-500 to-cyan-500",
  },
  speaking: {
    label: "Speaking",
    icon: "🗣️",
    gradient: "from-rose-500 to-orange-500",
    text: "text-rose-500",
    bar: "from-rose-500 to-orange-500",
  },
  reading: {
    label: "Reading",
    icon: "📖",
    gradient: "from-emerald-500 to-teal-500",
    text: "text-emerald-500",
    bar: "from-emerald-500 to-teal-500",
  },
  writing: {
    label: "Writing",
    icon: "✍️",
    gradient: "from-amber-400 to-orange-500",
    text: "text-amber-500",
    bar: "from-amber-400 to-orange-500",
  },
  pronunciation: {
    label: "Pronunciation",
    icon: "🔊",
    gradient: "from-pink-500 to-rose-500",
    text: "text-pink-500",
    bar: "from-pink-500 to-rose-500",
  },
};

export { TONES } from "@/lib/language/tones";
