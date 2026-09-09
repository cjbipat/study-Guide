/**
 * Browser voice selection.
 *
 * `speechSynthesis.getVoices()` returns everything installed, in no useful order.
 * `selectBestBrowserVoice` picks the closest locale match and prefers
 * high-quality on-device voices — and returns `null` rather than ever handing
 * back, say, an English voice to pronounce Mandarin.
 */

import type { VoiceOption } from "@/lib/language/audio/types";

function normalizeLocale(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, "-");
}

/** Names known to be good native voices across platforms (best-effort bonus). */
const PREFERRED_NAME_HINTS = [
  // macOS / iOS
  "ting-ting",
  "tingting",
  "mei-jia",
  "meijia",
  "sin-ji",
  "sinji",
  "li-mu",
  "yu-shu",
  "paulina",
  "mónica",
  "monica",
  "kyoko",
  "o-ren",
  "yuna",
  "amelie",
  "amélie",
  "thomas",
  "anna",
  "alice",
  "luciana",
  // Google
  "google",
  // Microsoft natural voices
  "natural",
  "xiaoxiao",
  "yunxi",
  "xiaoyi",
  "yaoyao",
  "kangkang",
  "huihui",
  "elvira",
  "dalia",
];

interface Scored {
  voice: SpeechSynthesisVoice;
  score: number;
}

function scoreVoice(
  voice: SpeechSynthesisVoice,
  target: string,
): number {
  const v = normalizeLocale(voice.lang);
  const t = normalizeLocale(target);
  const vBase = v.split("-")[0];
  const tBase = t.split("-")[0];

  // Never use a voice from a different language family.
  if (vBase !== tBase) return -Infinity;

  let score = 0;
  if (v === t)
    score += 100; // exact locale — zh-CN for zh-CN
  else if (v.startsWith(tBase + "-"))
    score += 55; // same language, different region — zh-TW for zh-CN
  else score += 35; // bare primary tag — zh for zh-CN

  if (voice.localService) score += 18;
  if (voice.default) score += 4;

  const name = voice.name.toLowerCase();
  if (PREFERRED_NAME_HINTS.some((h) => name.includes(h))) score += 10;
  // de-prioritise obviously low-quality / compact voices
  if (name.includes("compact") || name.includes("eloquence")) score -= 12;

  return score;
}

function allVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  try {
    return window.speechSynthesis.getVoices();
  } catch {
    return [];
  }
}

export function selectBestBrowserVoice(
  lang: string,
  preferredURI?: string | null,
): SpeechSynthesisVoice | null {
  const voices = allVoices();
  if (voices.length === 0) return null;

  const tBase = normalizeLocale(lang).split("-")[0];

  if (preferredURI) {
    const chosen = voices.find((v) => v.voiceURI === preferredURI);
    if (chosen && normalizeLocale(chosen.lang).split("-")[0] === tBase) {
      return chosen;
    }
    // preferred voice is gone or wrong language — fall through to auto-select
  }

  const ranked: Scored[] = voices
    .map((voice) => ({ voice, score: scoreVoice(voice, lang) }))
    .filter((s) => s.score > -Infinity)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.voice ?? null;
}

export function listBrowserVoices(lang: string): VoiceOption[] {
  const voices = allVoices();
  if (voices.length === 0) return [];

  const ranked: Scored[] = voices
    .map((voice) => ({ voice, score: scoreVoice(voice, lang) }))
    .filter((s) => s.score > -Infinity)
    .sort((a, b) => b.score - a.score);

  return ranked.map(({ voice }, i) => ({
    uri: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
    provider: "web-speech" as const,
    recommended: i === 0,
  }));
}

/** Prime the (lazily populated) voice list. Call once on mount. */
export function warmUpVoices(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", () => {
      window.speechSynthesis.getVoices();
    });
  } catch {
    /* ignore */
  }
}
