import type { DeckTheme } from "@/lib/types";

export interface ThemeTokens {
  /** primary accent (hex) — used for rings, fireworks palettes, charts */
  hex: string;
  /** soft tint background class */
  soft: string;
  /** solid accent text class */
  text: string;
  /** gradient for hero card faces / deck headers */
  gradient: string;
  /** two-stop gradient for progress bars */
  bar: string;
  /** ring / progress stroke class */
  ring: string;
  /** border accent */
  border: string;
  /** chip background */
  chip: string;
  label: string;
}

export const DECK_THEMES: Record<DeckTheme, ThemeTokens> = {
  violet: {
    hex: "#7c3aed",
    soft: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-300",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    bar: "from-violet-500 to-fuchsia-500",
    ring: "text-violet-500",
    border: "border-violet-500/30",
    chip: "bg-violet-500/12 text-violet-700 dark:text-violet-200",
    label: "Violet",
  },
  blue: {
    hex: "#2563eb",
    soft: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-300",
    gradient: "from-blue-500 via-sky-500 to-cyan-500",
    bar: "from-blue-500 to-cyan-500",
    ring: "text-blue-500",
    border: "border-blue-500/30",
    chip: "bg-blue-500/12 text-blue-700 dark:text-blue-200",
    label: "Blue",
  },
  emerald: {
    hex: "#10b981",
    soft: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-300",
    gradient: "from-emerald-500 via-green-500 to-teal-500",
    bar: "from-emerald-500 to-teal-500",
    ring: "text-emerald-500",
    border: "border-emerald-500/30",
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-200",
    label: "Emerald",
  },
  amber: {
    hex: "#f59e0b",
    soft: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-300",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    bar: "from-amber-400 to-rose-500",
    ring: "text-amber-500",
    border: "border-amber-500/30",
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-200",
    label: "Amber",
  },
  rose: {
    hex: "#f43f5e",
    soft: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-300",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
    bar: "from-rose-500 to-fuchsia-500",
    ring: "text-rose-500",
    border: "border-rose-500/30",
    chip: "bg-rose-500/12 text-rose-700 dark:text-rose-200",
    label: "Rose",
  },
  cyan: {
    hex: "#06b6d4",
    soft: "bg-cyan-500/10",
    text: "text-cyan-600 dark:text-cyan-300",
    gradient: "from-cyan-400 via-teal-500 to-emerald-500",
    bar: "from-cyan-400 to-emerald-500",
    ring: "text-cyan-500",
    border: "border-cyan-500/30",
    chip: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-200",
    label: "Cyan",
  },
  slate: {
    hex: "#64748b",
    soft: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-300",
    gradient: "from-slate-500 via-slate-600 to-slate-700",
    bar: "from-slate-500 to-slate-700",
    ring: "text-slate-500",
    border: "border-slate-500/30",
    chip: "bg-slate-500/12 text-slate-700 dark:text-slate-200",
    label: "Slate",
  },
};

export const DECK_THEME_LIST = Object.keys(DECK_THEMES) as DeckTheme[];

export function themeTokens(theme: DeckTheme): ThemeTokens {
  return DECK_THEMES[theme] ?? DECK_THEMES.violet;
}

export const DECK_ICONS = [
  "📚", "🧬", "💻", "📈", "🗾", "🌮", "🏛️", "🔬", "🎨", "🎵",
  "⚗️", "🧠", "🌍", "⚖️", "💡", "🚀", "📐", "🩺", "💰", "🗣️",
];
