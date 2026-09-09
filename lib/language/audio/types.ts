/**
 * Language audio — shared types.
 *
 * The provider stack, in priority order:
 *   1. NeuralAudioProvider   — configurable cloud neural TTS (preferred in prod)
 *   2. AudioCache            — never regenerate the same clip
 *   3. WebSpeechAudioProvider — browser speechSynthesis, honest fallback
 *
 * A caller (the UI) only ever talks to `LanguageAudioController`.
 */

export type AudioRate = "slow" | "normal" | "fast";

/** Playback rate multipliers. "slow" stays natural — provider-supported, not a
 *  pitch-shifted stretch. */
export const RATE_MULTIPLIER: Record<AudioRate, number> = {
  slow: 0.7,
  normal: 0.95,
  fast: 1.15,
};

export const AUDIO_RATES: { value: AudioRate; label: string }[] = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" },
];

export interface SpeakRequest {
  text: string;
  /** BCP-47, e.g. "zh-CN" */
  lang: string;
  rate: AudioRate;
  /** explicit voice; null = let the provider pick the best one */
  voiceURI?: string | null;
}

export type AudioProviderId = "neural" | "web-speech";

export interface VoiceOption {
  /** stable identifier — `voiceURI` for browser voices, an id for neural voices */
  uri: string;
  name: string;
  /** BCP-47 the voice speaks */
  lang: string;
  /** an on-device voice (generally higher quality, offline) */
  localService: boolean;
  provider: AudioProviderId;
  /** the provider's recommended default for this language */
  recommended?: boolean;
}

export interface VoicePreference {
  /** null = auto-select the best available voice */
  voiceURI: string | null;
  rate: AudioRate;
}

export const DEFAULT_VOICE_PREFERENCE: VoicePreference = {
  voiceURI: null,
  rate: "normal",
};

/** Per-BCP-47-locale audio preferences. Device-specific (voices differ per
 *  device), so this lives in localStorage, not the synced snapshot. */
export type LanguageAudioSettings = Record<string, VoicePreference>;

export type AudioPlaybackState = "idle" | "preparing" | "playing" | "error";

export interface PlaybackHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

/** A resolved, ready-to-play clip. */
export interface PreparedAudio {
  readonly source: AudioProviderId;
  /** starts playback; fires handlers. Safe to call more than once (replays). */
  play(handlers?: PlaybackHandlers): void;
  stop(): void;
}

export interface AudioProvider {
  readonly id: AudioProviderId;
  /** best-effort synchronous check that this provider can speak `lang` now */
  isAvailable(lang: string): boolean;
  /** voices this provider offers for `lang`, best-first */
  listVoices(lang: string): VoiceOption[];
  /** resolve (and if needed fetch/generate) the clip. Rejects on failure. */
  prepare(req: SpeakRequest): Promise<PreparedAudio>;
}
