"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AudioButton } from "@/components/language/AudioButton";
import type { RomanizationMode } from "@/lib/language/types";
import { normalizeAnswer, type VocabularyExercise } from "@/lib/language/vocabulary-exercises";
import { cn } from "@/lib/utils";

/**
 * Multiple-choice vocabulary practice — audio-to-target, context-cloze,
 * sentence-use. Options are always target-language forms (words / sentences),
 * never English meanings, so nothing is given away before the pick.
 */
export function VocabChoiceCard({
  exercise,
  speechLang,
  romanizationMode,
  onAnswer,
}: {
  exercise: VocabularyExercise;
  speechLang: string;
  romanizationMode: RomanizationMode;
  onAnswer: (correct: boolean, ms: number) => void;
}) {
  void romanizationMode;
  const [choice, setChoice] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const start = useState(() => Date.now())[0];

  useEffect(() => {
    setChoice(null);
    setAnswered(false);
  }, [exercise]);

  const options = useMemo(() => exercise.options ?? [], [exercise]);
  const answer = exercise.answer ?? "";
  const isCorrect = (opt: string) => normalizeAnswer(opt) === normalizeAnswer(answer);

  const pick = useCallback(
    (opt: string) => {
      if (answered) return;
      setChoice(opt);
      setAnswered(true);
      onAnswer(isCorrect(opt), Date.now() - start);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answered, onAnswer, start, answer],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length && !answered) {
        e.preventDefault();
        pick(options[n - 1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, answered, pick]);

  const sentenceLike = exercise.type === "sentence-use";

  return (
    <div className={sentenceLike ? "" : "text-center"}>
      <p
        className={cn(
          "text-xs font-bold uppercase tracking-widest",
          exercise.audioFirst ? "text-primary" : "text-emerald-500",
        )}
      >
        {exercise.tag}
      </p>

      {exercise.audioFirst ? (
        <div className="mt-5 flex flex-col items-center gap-2">
          <AudioButton
            text={exercise.audioText}
            lang={speechLang}
            size="lg"
            autoPlay
            label="Play again"
            showSlow
          />
          <p className="mt-3 text-lg font-bold text-muted">{exercise.question}</p>
        </div>
      ) : (
        <p
          className={cn(
            "mt-3 font-extrabold leading-snug",
            sentenceLike ? "text-xl" : "text-2xl sm:text-3xl",
          )}
        >
          {exercise.question}
        </p>
      )}

      <div
        className={cn(
          "mt-6 grid gap-2.5",
          sentenceLike ? "" : "sm:grid-cols-2",
        )}
      >
        {options.map((opt, i) => {
          const correct = isCorrect(opt);
          const chosen = opt === choice;
          return (
            <button
              key={opt + i}
              disabled={answered}
              onClick={() => pick(opt)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-2xl border px-4 py-3.5 text-left font-semibold transition-colors disabled:cursor-default",
                sentenceLike ? "text-base" : "text-xl",
                !answered && "border-border-strong hover:border-primary hover:bg-primary/5",
                answered && correct && "border-success bg-success/10 text-success-strong dark:text-success",
                answered && chosen && !correct && "border-accent bg-accent/10 text-accent",
                answered && !correct && !chosen && "border-border opacity-60",
              )}
            >
              <span className="flex items-center gap-2">
                {!answered && (
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-foreground/8 text-[11px] font-bold text-muted-2">
                    {i + 1}
                  </span>
                )}
                <span>{opt}</span>
              </span>
              {answered && correct && <Check className="h-4 w-4 shrink-0" />}
              {answered && chosen && !correct && <X className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl border border-border bg-surface-2 p-4 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-lg font-extrabold">{exercise.reveal.target}</p>
                <p className="text-sm text-muted">
                  {exercise.reveal.pronunciation} · {exercise.reveal.translation}
                </p>
              </div>
              <AudioButton
                text={exercise.reveal.target}
                lang={speechLang}
                size="sm"
                showSlow
              />
            </div>
            {exercise.reveal.example && (
              <p className="mt-2 border-t border-border pt-2 text-sm">
                <span className="font-semibold">{exercise.reveal.example}</span>
                {exercise.reveal.exampleTranslation && (
                  <span className="text-muted">
                    {" "}
                    — {exercise.reveal.exampleTranslation}
                  </span>
                )}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
