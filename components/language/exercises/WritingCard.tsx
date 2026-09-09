"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Romanization } from "@/components/language/Romanization";
import { Button } from "@/components/ui/Button";
import type { Exercise } from "@/lib/language/exercises";
import type { RomanizationMode } from "@/lib/language/types";
import { cn } from "@/lib/utils";

function norm(s: string) {
  return s.trim().toLowerCase().replace(/[.,!?，。！？、\s]/g, "");
}

export function WritingCard({
  exercise,
  romanizationMode,
  onAnswer,
}: {
  exercise: Extract<Exercise, { kind: "writing-translate" | "writing-order" }>;
  romanizationMode: RomanizationMode;
  onAnswer: (correct: boolean, ms: number) => void;
}) {
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const start = useState(() => Date.now())[0];

  useEffect(() => {
    setAnswered(false);
    setCorrect(false);
    setTyped("");
    setPicked([]);
  }, [exercise]);

  const item = exercise.item;

  function submit(ok: boolean) {
    setCorrect(ok);
    setAnswered(true);
    onAnswer(ok, Date.now() - start);
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-amber-500">
        {exercise.kind === "writing-order" ? "Arrange the words" : "Translation"}
      </p>
      <p className="mt-3 text-xl font-extrabold sm:text-2xl">{exercise.prompt}</p>

      {exercise.kind === "writing-translate" ? (
        <div className="mt-5">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={answered}
            placeholder="Type your answer…"
            className="input text-lg"
            onKeyDown={(e) =>
              e.key === "Enter" && !answered && submit(norm(typed) === norm(exercise.answer))
            }
            autoFocus
          />
          {!answered && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => submit(norm(typed) === norm(exercise.answer))}
            >
              Check
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-5">
          <div className="min-h-[3.25rem] rounded-2xl border border-border-strong bg-surface-2 p-3 text-lg font-bold">
            {picked.join(item.languageId === "mandarin" ? "" : " ") || (
              <span className="text-muted-2">Tap the words in order…</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {exercise.tokens.map((tok, i) => {
              const used = picked.filter((p) => p === tok).length;
              const total = exercise.tokens.filter((t) => t === tok).length;
              const disabled = answered || used >= total;
              return (
                <button
                  key={tok + i}
                  disabled={disabled}
                  onClick={() => setPicked((p) => [...p, tok])}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-lg font-bold transition-colors",
                    disabled
                      ? "border-border bg-surface-2 opacity-30"
                      : "border-border-strong bg-surface-solid hover:border-primary",
                  )}
                >
                  {tok}
                </button>
              );
            })}
          </div>
          {!answered && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={picked.length !== exercise.tokens.length}
                onClick={() =>
                  submit(
                    picked.join(item.languageId === "mandarin" ? "" : " ") ===
                      exercise.answer,
                  )
                }
              >
                Check
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPicked([])}>
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-5 rounded-2xl border p-4",
              correct
                ? "border-success/40 bg-success/8"
                : "border-accent/40 bg-accent/8",
            )}
          >
            <p className="flex items-center gap-1.5 text-sm font-bold">
              {correct ? (
                <>
                  <Check className="h-4 w-4 text-success" /> Correct
                </>
              ) : (
                <>
                  <X className="h-4 w-4 text-accent" /> Answer:
                </>
              )}
            </p>
            <p className="mt-1 text-lg font-extrabold">{exercise.answer}</p>
            <Romanization
              text={item.examplePronunciation ?? item.pronunciation}
              mode={romanizationMode === "hidden" ? "always" : romanizationMode}
              size="sm"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
