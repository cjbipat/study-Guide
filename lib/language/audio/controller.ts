/**
 * LanguageAudioController — the one thing the UI talks to.
 *
 * Tries providers in priority order (neural → browser), transparently falls back
 * if the preferred one fails mid-request, and surfaces clean start / end / error
 * signals so the UI can show "Preparing pronunciation…", play, or offer
 * "Try Again" — and never mark audio as played when it didn't.
 */

import {
  type AudioProvider,
  type AudioProviderId,
  type PlaybackHandlers,
  type PreparedAudio,
  type SpeakRequest,
  type VoiceOption,
} from "@/lib/language/audio/types";
import {
  getNeuralAudioProvider,
  getWebSpeechProvider,
  isNeuralAudioConfigured,
} from "@/lib/language/audio/providers";

export interface SpeakHandle {
  stop(): void;
}

export interface ActiveVoiceInfo {
  providerId: AudioProviderId | null;
  /** true when we're on the browser fallback rather than neural */
  isFallback: boolean;
}

export class LanguageAudioController {
  private providers(): AudioProvider[] {
    return [getNeuralAudioProvider(), getWebSpeechProvider()];
  }

  /** the provider that will actually be used for `lang`, or null if none can */
  resolveProvider(lang: string): AudioProvider | null {
    for (const p of this.providers()) {
      if (p.isAvailable(lang)) return p;
    }
    return null;
  }

  activeVoiceInfo(lang: string): ActiveVoiceInfo {
    const p = this.resolveProvider(lang);
    return {
      providerId: p?.id ?? null,
      isFallback: p?.id === "web-speech" && isNeuralAudioConfigured(),
    };
  }

  /** best-effort: is any voice available for `lang` right now? */
  isAvailable(lang: string): boolean {
    return this.resolveProvider(lang) !== null;
  }

  listVoices(lang: string): VoiceOption[] {
    const out: VoiceOption[] = [];
    for (const p of this.providers()) {
      if (p.isAvailable(lang)) out.push(...p.listVoices(lang));
    }
    return out;
  }

  /** resolve a clip, falling back from neural → browser on failure */
  async prepare(req: SpeakRequest): Promise<PreparedAudio> {
    const chain = this.providers().filter((p) => p.isAvailable(req.lang));
    if (chain.length === 0) {
      throw new Error(`No voice is available for ${req.lang}.`);
    }
    let lastErr: unknown;
    for (const provider of chain) {
      try {
        return await provider.prepare(req);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error("Audio could not be prepared.");
  }

  /**
   * Prepare + play in one call. `onStart` fires only when audio truly begins;
   * `onEnd` only after a real start; `onError` for every failure path.
   */
  speak(req: SpeakRequest, handlers: PlaybackHandlers = {}): SpeakHandle {
    let stopped = false;
    let prepared: PreparedAudio | null = null;

    this.prepare(req)
      .then((p) => {
        prepared = p;
        if (stopped) return;
        p.play(handlers);
      })
      .catch((e: unknown) => {
        if (stopped) return;
        handlers.onError?.(
          e instanceof Error ? e.message : "Audio is temporarily unavailable.",
        );
      });

    return {
      stop: () => {
        stopped = true;
        prepared?.stop();
      },
    };
  }

  cancelAll(): void {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      /* ignore */
    }
  }
}

let controller: LanguageAudioController | null = null;

export function getLanguageAudioController(): LanguageAudioController {
  if (!controller) controller = new LanguageAudioController();
  return controller;
}
