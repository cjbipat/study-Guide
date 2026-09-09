"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useState } from "react";

import { AudioButton } from "@/components/language/AudioButton";
import { Recorder } from "@/components/language/Recorder";
import { Romanization } from "@/components/language/Romanization";
import { Button } from "@/components/ui/Button";
import type { Exercise } from "@/lib/language/exercises";
import type { RomanizationMode } from "@/lib/language/types";

/** Listen & Repeat: hear → read → translation → repeat → record → compare. */
export function ShadowingCard({
  exercise,
  speechLang,
  romanizationMode,
  onRecorded,
  onDone,
}: {
  exercise: Extract<Exercise, { kind: "shadowing" }>;
  speechLang: string;
  romanizationMode: RomanizationMode;
  onRecorded: (durationMs: number, lineId: string) => void;
  onDone: () => void;
}) {
  const { line } = exercise;
  const [recorded, setRecorded] = useState(false);

  useEffect(() => setRecorded(false), [exercise]);

  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-rose-500">
        Listen &amp; Repeat
      </p>

      <div className="mt-5 flex justify-center">
        <AudioButton text={line.target} lang={speechLang} size="lg" autoPlay label="Play" />
      </div>

      <p className="mt-6 text-2xl font-extrabold leading-snug sm:text-3xl">
        {line.target}
      </p>
      <div className="mt-2">
        <Romanization
          text={line.pronunciation}
          mode={romanizationMode === "hidden" ? "always" : romanizationMode}
          size="md"
        />
      </div>
      <p className="mt-1 text-muted">{line.translation}</p>

      <div className="mt-7 flex flex-col items-center gap-3">
        <p className="text-sm font-semibold text-muted">Your turn — repeat it aloud</p>
        <Recorder
          onComplete={(ms) => {
            setRecorded(true);
            onRecorded(ms, line.id);
          }}
        />
        {recorded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <AudioButton
              text={line.target}
              lang={speechLang}
              size="sm"
              label="▶ Compare (original)"
            />
          </motion.div>
        )}
      </div>

      <p className="mt-5 text-xs text-muted-2">
        Pronunciation feedback is coming soon — for now, compare your recording to
        the original.
      </p>

      <Button size="lg" className="mt-6" onClick={onDone}>
        {recorded ? (
          <>
            <Check className="h-4 w-4" /> Continue
          </>
        ) : (
          <>
            Skip <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
