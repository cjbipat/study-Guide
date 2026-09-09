/**
 * Audio providers.
 *
 * `NeuralAudioProvider` is the preferred production source: a configurable cloud
 * neural TTS. It ships **unconfigured** — exactly like the honest
 * `PronunciationEvaluator` seam — so until `configureNeuralAudio()` is called
 * with a real endpoint + key, `isAvailable()` returns false and the controller
 * falls through to the browser. Wiring a key activates it with no UI change.
 *
 * `WebSpeechAudioProvider` is the always-present fallback, now with real voice
 * selection (`selectBestBrowserVoice`) instead of "first voice wins".
 */

import {
  RATE_MULTIPLIER,
  type AudioProvider,
  type PreparedAudio,
  type SpeakRequest,
  type VoiceOption,
} from "@/lib/language/audio/types";
import { audioCacheKey, getAudioCache } from "@/lib/language/audio/cache";
import {
  listBrowserVoices,
  selectBestBrowserVoice,
} from "@/lib/language/audio/browser-voice";

/* ------------------------------------------------------------------ */
/*  Browser speechSynthesis                                            */
/* ------------------------------------------------------------------ */

export class WebSpeechAudioProvider implements AudioProvider {
  readonly id = "web-speech" as const;

  private supported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  isAvailable(lang: string): boolean {
    if (!this.supported()) return false;
    // Voices populate async in Chrome — be optimistic while the list is empty,
    // but once populated require a genuine same-language match.
    try {
      if (window.speechSynthesis.getVoices().length === 0) return true;
    } catch {
      return false;
    }
    return selectBestBrowserVoice(lang) !== null;
  }

  listVoices(lang: string): VoiceOption[] {
    return listBrowserVoices(lang);
  }

  async prepare(req: SpeakRequest): Promise<PreparedAudio> {
    if (!this.supported()) {
      throw new Error("Speech synthesis is not supported in this browser.");
    }
    const voice = selectBestBrowserVoice(req.lang, req.voiceURI ?? undefined);
    if (
      window.speechSynthesis.getVoices().length > 0 &&
      voice === null
    ) {
      throw new Error(`No ${req.lang} voice is installed on this device.`);
    }

    const rate = RATE_MULTIPLIER[req.rate];
    let current: SpeechSynthesisUtterance | null = null;

    return {
      source: "web-speech",
      play: (handlers) => {
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(req.text);
          u.lang = voice?.lang ?? req.lang;
          u.rate = rate;
          if (voice) u.voice = voice;
          let started = false;
          u.onstart = () => {
            started = true;
            handlers?.onStart?.();
          };
          u.onend = () => {
            // Only report a natural end if playback actually began.
            if (started) handlers?.onEnd?.();
            else handlers?.onError?.("Audio did not start.");
          };
          u.onerror = (e) => {
            const err = (e as SpeechSynthesisErrorEvent).error;
            if (err === "canceled" || err === "interrupted") return;
            handlers?.onError?.("Audio playback failed.");
          };
          current = u;
          window.speechSynthesis.speak(u);
          // Chrome sometimes never fires `onstart` even when audio is playing.
          // After a beat, if the engine reports it's speaking, treat that as the
          // start; if nothing is happening at all, report the failure honestly.
          window.setTimeout(() => {
            if (started || current !== u) return;
            if (
              window.speechSynthesis.speaking ||
              window.speechSynthesis.pending
            ) {
              started = true;
              handlers?.onStart?.();
            } else {
              handlers?.onError?.("Audio is temporarily unavailable.");
            }
          }, 1400);
        } catch {
          handlers?.onError?.("Audio playback failed.");
        }
      },
      stop: () => {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
      },
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Neural (cloud) TTS — configurable, unconfigured by default         */
/* ------------------------------------------------------------------ */

export interface NeuralAudioConfig {
  /** POST endpoint that returns audio bytes for `{ text, lang, voice, rate }` */
  endpoint: string;
  apiKey: string;
  /** available voices per BCP-47 primary tag, e.g. { zh: [...], es: [...] } */
  voices: Record<string, VoiceOption[]>;
  /** audio mime the endpoint returns (default audio/mpeg) */
  mimeType?: string;
}

let neuralConfig: NeuralAudioConfig | null = null;

/** Activate the neural provider. Call once at startup with real credentials. */
export function configureNeuralAudio(config: NeuralAudioConfig | null): void {
  neuralConfig = config;
}

export function isNeuralAudioConfigured(): boolean {
  return !!neuralConfig?.endpoint && !!neuralConfig?.apiKey;
}

export class NeuralAudioProvider implements AudioProvider {
  readonly id = "neural" as const;

  isAvailable(lang: string): boolean {
    if (!isNeuralAudioConfigured()) return false;
    const base = lang.toLowerCase().split("-")[0];
    return (neuralConfig!.voices[base]?.length ?? 0) > 0;
  }

  listVoices(lang: string): VoiceOption[] {
    if (!neuralConfig) return [];
    const base = lang.toLowerCase().split("-")[0];
    return neuralConfig.voices[base] ?? [];
  }

  async prepare(req: SpeakRequest): Promise<PreparedAudio> {
    if (!neuralConfig) throw new Error("Neural audio is not configured.");

    const cache = getAudioCache();
    const key = audioCacheKey(req);
    let url = cache.get(key);

    if (!url) {
      const res = await fetch(neuralConfig.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${neuralConfig.apiKey}`,
        },
        body: JSON.stringify({
          text: req.text,
          lang: req.lang,
          voice: req.voiceURI ?? undefined,
          rate: RATE_MULTIPLIER[req.rate],
        }),
      });
      if (!res.ok) {
        throw new Error(`Neural audio request failed (${res.status}).`);
      }
      const blob = await res.blob();
      url = URL.createObjectURL(blob);
      cache.set(key, url, blob.size);
    }

    const audio = new Audio(url);
    audio.preload = "auto";

    return {
      source: "neural",
      play: (handlers) => {
        audio.currentTime = 0;
        let started = false;
        audio.onplaying = () => {
          started = true;
          handlers?.onStart?.();
        };
        audio.onended = () => {
          if (started) handlers?.onEnd?.();
        };
        audio.onerror = () => handlers?.onError?.("Audio playback failed.");
        audio.play().catch(() => handlers?.onError?.("Audio playback failed."));
      },
      stop: () => {
        audio.pause();
      },
    };
  }
}

/* ------------------------------------------------------------------ */

let web: WebSpeechAudioProvider | null = null;
let neural: NeuralAudioProvider | null = null;

export function getWebSpeechProvider(): WebSpeechAudioProvider {
  if (!web) web = new WebSpeechAudioProvider();
  return web;
}

export function getNeuralAudioProvider(): NeuralAudioProvider {
  if (!neural) neural = new NeuralAudioProvider();
  return neural;
}
