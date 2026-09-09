"use client";

import { motion } from "framer-motion";
import { Loader2, RotateCcw, Turtle, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getLanguageAudioController,
  useAudioPreference,
  warmUpVoices,
  type AudioPlaybackState,
  type AudioRate,
  type SpeakHandle,
} from "@/lib/language/audio";
import { cn } from "@/lib/utils";

export function AudioButton({
  text,
  lang,
  size = "md",
  label,
  autoPlay = false,
  slow = false,
  rate,
  showSlow = false,
  className,
}: {
  text: string;
  lang: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  autoPlay?: boolean;
  /** force the slow rate for this button */
  slow?: boolean;
  /** explicit rate; overrides the learner's saved preference */
  rate?: AudioRate;
  /** also render a small secondary "Slow" control */
  showSlow?: boolean;
  className?: string;
}) {
  const controller = getLanguageAudioController();
  const pref = useAudioPreference(lang);
  const [supported, setSupported] = useState(true);
  const [state, setState] = useState<AudioPlaybackState>("idle");
  const handleRef = useRef<SpeakHandle | null>(null);
  const mountedRef = useRef(true);

  const baseRate: AudioRate = slow ? "slow" : (rate ?? pref.rate);

  useEffect(() => {
    mountedRef.current = true;
    warmUpVoices();
    // voices can arrive a beat late — re-check shortly after mount
    const check = () => {
      if (mountedRef.current) setSupported(controller.isAvailable(lang));
    };
    check();
    const t = window.setTimeout(check, 600);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(t);
      handleRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const play = useCallback(
    (playRate: AudioRate) => {
      if (!controller.isAvailable(lang)) {
        setSupported(false);
        return;
      }
      handleRef.current?.stop();
      setState("preparing");
      handleRef.current = controller.speak(
        { text, lang, rate: playRate, voiceURI: pref.voiceURI },
        {
          onStart: () => mountedRef.current && setState("playing"),
          onEnd: () => mountedRef.current && setState("idle"),
          onError: () => mountedRef.current && setState("error"),
        },
      );
    },
    [controller, lang, text, pref.voiceURI],
  );

  useEffect(() => {
    if (autoPlay && supported) {
      const t = window.setTimeout(() => play(baseRate), 250);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text, supported]);

  const dims = { sm: "h-9 w-9", md: "h-12 w-12", lg: "h-16 w-16" }[size];
  const icon = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" }[size];

  if (!supported) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-foreground/6 px-3 py-2 text-xs font-semibold text-muted",
          className,
        )}
        title="No speech voice for this language is installed on your device"
      >
        <VolumeX className={icon} /> Audio unavailable on this device
      </span>
    );
  }

  if (state === "error") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent",
          className,
        )}
      >
        Audio is temporarily unavailable.
        <button
          type="button"
          onClick={() => play(baseRate)}
          className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 font-bold hover:bg-accent/25"
        >
          <RotateCcw className="h-3 w-3" /> Try Again
        </button>
      </span>
    );
  }

  const preparing = state === "preparing";
  const playing = state === "playing";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <motion.button
        type="button"
        onClick={() => play(baseRate)}
        whileTap={{ scale: 0.92 }}
        disabled={preparing}
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-glow transition-transform hover:scale-105 disabled:opacity-80",
          dims,
        )}
        aria-label={
          preparing
            ? "Preparing pronunciation"
            : (label ?? "Play pronunciation")
        }
        aria-busy={preparing}
      >
        {preparing ? (
          <Loader2 className={cn(icon, "animate-spin")} />
        ) : (
          <motion.span
            animate={playing ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 0.6, repeat: playing ? Infinity : 0 }}
          >
            <Volume2 className={icon} />
          </motion.span>
        )}
      </motion.button>

      {label && (
        <span className="text-sm font-semibold text-muted">
          {preparing ? "Preparing pronunciation…" : label}
        </span>
      )}

      {showSlow && !slow && (
        <button
          type="button"
          onClick={() => play("slow")}
          disabled={preparing}
          className="inline-flex items-center gap-1 rounded-full border border-border-strong px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          <Turtle className="h-3.5 w-3.5" /> Slow
        </button>
      )}
    </span>
  );
}
