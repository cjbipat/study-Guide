"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";

import { AudioButton } from "@/components/language/AudioButton";
import {
  AUDIO_RATES,
  getLanguageAudioController,
  setAudioRate,
  setAudioVoice,
  useAudioPreference,
  warmUpVoices,
  type VoiceOption,
} from "@/lib/language/audio";
import { cn } from "@/lib/utils";

/**
 * Voice + speed picker for a language. All logic lives in `lib/language/audio`;
 * this only renders the choices the controller reports as actually available.
 */
export function AudioSettingsPanel({
  speechLang,
  sampleText,
}: {
  speechLang: string;
  /** a short word in the target language to preview the voice */
  sampleText: string;
}) {
  const controller = getLanguageAudioController();
  const pref = useAudioPreference(speechLang);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const info = controller.activeVoiceInfo(speechLang);

  useEffect(() => {
    warmUpVoices();
    const load = () => setVoices(controller.listVoices(speechLang));
    load();
    const t = window.setTimeout(load, 700);
    return () => window.clearTimeout(t);
  }, [controller, speechLang]);

  const available = controller.isAvailable(speechLang);

  return (
    <div>
      <p className="text-sm font-bold">Pronunciation audio</p>
      <p className="text-xs text-muted">
        {info.providerId === "neural"
          ? "Using a high-quality neural voice."
          : available
            ? "Using your device's built-in voice for this language."
            : "No voice for this language is installed on this device."}
      </p>

      {available && (
        <>
          {voices.length > 1 && (
            <label className="mt-3 block">
              <span className="text-xs font-semibold text-muted">Voice</span>
              <select
                value={pref.voiceURI ?? ""}
                onChange={(e) =>
                  setAudioVoice(speechLang, e.target.value || null)
                }
                className="input mt-1 w-full text-sm"
              >
                <option value="">Default (recommended)</option>
                {voices.map((v) => (
                  <option key={v.uri} value={v.uri}>
                    {v.name}
                    {v.localService ? " · on-device" : ""}
                    {v.recommended ? " · recommended" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="mt-3">
            <span className="text-xs font-semibold text-muted">
              Speaking speed
            </span>
            <div className="mt-1 flex gap-1.5">
              {AUDIO_RATES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setAudioRate(speechLang, r.value)}
                  className={cn(
                    "flex-1 rounded-xl border px-2 py-1.5 text-xs font-semibold transition-colors",
                    pref.rate === r.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-strong text-muted hover:text-foreground",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <AudioButton
              text={sampleText}
              lang={speechLang}
              size="sm"
              showSlow
            />
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Volume2 className="h-3.5 w-3.5" /> Test voice
            </span>
          </div>
        </>
      )}
    </div>
  );
}
