"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AudioButton } from "@/components/language/AudioButton";
import { TONES } from "@/lib/language/tones";
import type { Exercise } from "@/lib/language/exercises";
import { cn } from "@/lib/utils";

export function ToneContour({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 44" className={cn("h-10 w-16", className)} aria-hidden>
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ToneCard({
  exercise,
  speechLang,
  onAnswer,
}: {
  exercise: Extract<Exercise, { kind: "tone" }>;
  speechLang: string;
  onAnswer: (correct: boolean, ms: number) => void;
}) {
  const [answered, setAnswered] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const start = useState(() => Date.now())[0];

  useEffect(() => {
    setAnswered(false);
    setChoice(null);
  }, [exercise]);

  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-pink-500">
        Tone practice
      </p>
      <p className="mt-3 text-sm text-muted">
        Listen and choose the tone you hear.
      </p>

      <div className="mt-5 flex justify-center">
        <AudioButton
          text={exercise.audioText}
          lang={speechLang}
          size="lg"
          autoPlay
          label="Play again"
          showSlow
        />
      </div>

      <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {TONES.map((t) => {
          const isAnswer = t.n === exercise.answer;
          const isChoice = t.n === choice;
          return (
            <button
              key={t.n}
              disabled={answered}
              onClick={() => {
                if (answered) return;
                setChoice(t.n);
                setAnswered(true);
                onAnswer(t.n === exercise.answer, Date.now() - start);
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border p-3 transition-colors disabled:cursor-default",
                !answered && "border-border-strong hover:border-primary hover:bg-primary/5",
                answered && isAnswer && "border-success bg-success/10",
                answered && isChoice && !isAnswer && "border-accent bg-accent/10",
                answered && !isAnswer && !isChoice && "border-border opacity-50",
              )}
            >
              <ToneContour path={t.contour} className="text-primary" />
              <span className="text-lg font-extrabold">{t.example}</span>
              <span className="text-[11px] font-semibold text-muted">{t.desc}</span>
              {answered && isAnswer && <Check className="h-4 w-4 text-success" />}
              {answered && isChoice && !isAnswer && <X className="h-4 w-4 text-accent" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5"
          >
            <p className="text-sm font-semibold text-muted">
              {TONES[exercise.answer - 1].name} —{" "}
              {TONES[exercise.answer - 1].desc}. Tone accuracy scoring will arrive
              with pronunciation evaluation.
            </p>
            <div className="mt-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                Hear each tone
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {TONES.map((t) => (
                  <AudioButton
                    key={t.n}
                    text={t.example}
                    lang={speechLang}
                    size="sm"
                    label={t.example}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
