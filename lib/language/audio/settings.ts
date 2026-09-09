/**
 * LanguageAudioSettings — per-locale voice + speed preferences.
 *
 * Device-specific (installed voices differ per device), so this is localStorage,
 * not the synced snapshot. A tiny subscription lets every `<AudioButton>` react
 * when the learner changes the voice in settings.
 */

"use client";

import { useSyncExternalStore } from "react";

import {
  DEFAULT_VOICE_PREFERENCE,
  type AudioRate,
  type LanguageAudioSettings,
  type VoicePreference,
} from "@/lib/language/audio/types";

const KEY = "ember.language-audio.v1";

let memory: LanguageAudioSettings = {};
let loaded = false;
const listeners = new Set<() => void>();

function read(): LanguageAudioSettings {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LanguageAudioSettings;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function ensureLoaded(): void {
  if (loaded) return;
  memory = read();
  loaded = true;
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* quota / private mode — stay in-memory */
  }
  listeners.forEach((l) => l());
}

export function getAudioPreference(lang: string): VoicePreference {
  ensureLoaded();
  return { ...DEFAULT_VOICE_PREFERENCE, ...(memory[lang] ?? {}) };
}

export function setAudioPreference(
  lang: string,
  patch: Partial<VoicePreference>,
): void {
  ensureLoaded();
  memory = {
    ...memory,
    [lang]: { ...DEFAULT_VOICE_PREFERENCE, ...(memory[lang] ?? {}), ...patch },
  };
  persist();
}

export function setAudioVoice(lang: string, voiceURI: string | null): void {
  setAudioPreference(lang, { voiceURI });
}

export function setAudioRate(lang: string, rate: AudioRate): void {
  setAudioPreference(lang, { rate });
}

/* ---- React binding ------------------------------------------------ */

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Cache the snapshot object per lang so useSyncExternalStore doesn't loop.
const snapshotCache = new Map<string, VoicePreference>();

function getSnapshot(lang: string): VoicePreference {
  const next = getAudioPreference(lang);
  const prev = snapshotCache.get(lang);
  if (prev && prev.voiceURI === next.voiceURI && prev.rate === next.rate) {
    return prev;
  }
  snapshotCache.set(lang, next);
  return next;
}

const SERVER_DEFAULT = DEFAULT_VOICE_PREFERENCE;

export function useAudioPreference(lang: string): VoicePreference {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(lang),
    () => SERVER_DEFAULT,
  );
}
