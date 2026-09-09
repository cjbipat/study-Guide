"use client";

import { ArrowRight, Check, Info } from "lucide-react";
import { useEffect, useState } from "react";

import { AudioButton } from "@/components/language/AudioButton";
import { Recorder } from "@/components/language/Recorder";
import { Romanization } from "@/components/language/Romanization";
import { Button } from "@/components/ui/Button";
import { getPronunciationEvaluator } from "@/lib/language/pronunciation";
import type { Exercise } from "@/lib/language/exercises";
import type { RomanizationMode } from "@/lib/language/types";

export function SpeakingCard({
  exercise,
  speechLang,
  romanizationMode,
  onRecorded,
  onDone,
}: {
  exercise: Extract<Exercise, { kind: "speaking" }>;
  speechLang: string;
  romanizationMode: RomanizationMode;
  onRecorded: (durationMs: number, vocabId: string) => void;
  onDone: () => void;
}) {
  const { item } = exercise;
  const [recorded, setRecorded] = useState(false);
  const evaluator = getPronunciationEvaluator();

  useEffect(() => setRecorded(false), [exercise]);

  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-rose-500">
        Speaking practice
      </p>

      <p className="mt-5 text-4xl font-extrabold sm:text-5xl">{item.target}</p>
      <div className="mt-2">
        <Romanization
          text={item.pronunciation}
          mode={romanizationMode === "hidden" ? "always" : romanizationMode}
          size="lg"
        />
      </div>
      <p className="mt-1 text-muted">{item.translation}</p>

      <div className="mt-5 flex justify-center">
        <AudioButton
          text={item.target}
          lang={speechLang}
          size="lg"
          autoPlay
          label="Correct pronunciation"
        />
      </div>

      <div className="mt-7">
        <p className="text-sm font-semibold text-muted">Your Turn</p>
        <div className="mt-2 flex justify-center">
          <Recorder
            onComplete={(ms) => {
              setRecorded(true);
              onRecorded(ms, item.id);
            }}
          />
        </div>
      </div>

      {!evaluator.available && (
        <p className="mx-auto mt-5 flex max-w-sm items-start gap-2 rounded-xl border border-border bg-surface-2 p-3 text-left text-xs text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          Pronunciation feedback is coming soon. You can still listen, record
          yourself, and replay to compare.
        </p>
      )}

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
