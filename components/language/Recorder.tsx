"use client";

import { motion } from "framer-motion";
import { Mic, Play, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type State = "idle" | "recording" | "recorded" | "denied" | "unsupported";

/**
 * Client-only audio recorder. Recordings live as object URLs in memory only —
 * never persisted. `onComplete` gets the duration so the parent can log a
 * PronunciationAttempt (metadata, no audio, no score).
 */
export function Recorder({
  onComplete,
  className,
}: {
  onComplete?: (durationMs: number) => void;
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof window === "undefined" ||
      !("MediaRecorder" in window)
    ) {
      setState("unsupported");
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (url) URL.revokeObjectURL(url);
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(blob));
        const dur = Date.now() - startRef.current;
        setState("recorded");
        onComplete?.(dur);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = rec;
      startRef.current = Date.now();
      setSeconds(0);
      rec.start();
      setState("recording");
      timerRef.current = setInterval(
        () => setSeconds((s) => Math.min(s + 1, 60)),
        1000,
      );
    } catch {
      setState("denied");
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stop();
  }

  function reset() {
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
    setSeconds(0);
    setState("idle");
  }

  if (state === "unsupported") {
    return (
      <p className={cn("text-sm text-muted", className)}>
        Recording isn&apos;t supported in this browser.
      </p>
    );
  }
  if (state === "denied") {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-sm font-semibold text-accent">
          Microphone access was blocked.
        </p>
        <button
          onClick={() => setState("idle")}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {state === "idle" && (
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={start}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-glow"
        >
          <Mic className="h-4 w-4" /> Record Yourself
        </motion.button>
      )}

      {state === "recording" && (
        <button
          onClick={stop}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-white"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <Square className="h-3.5 w-3.5 fill-current" /> Stop · {seconds}s
        </button>
      )}

      {state === "recorded" && url && (
        <>
          <button
            onClick={() => audioRef.current?.play()}
            className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-solid px-4 py-2.5 text-sm font-bold"
          >
            <Play className="h-4 w-4" /> Play your recording
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Record again
          </button>
          <audio ref={audioRef} src={url} className="hidden" />
        </>
      )}
    </div>
  );
}
