"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { AudioButton } from "@/components/language/AudioButton";
import { Button } from "@/components/ui/Button";
import type { Exercise } from "@/lib/language/exercises";
import type { RomanizationMode } from "@/lib/language/types";

function norm(s: string) {
  return s.trim().toLowerCase().replace(/[.,!?，。！？\s]/g, "");
}

/** Type what you heard (in the target script). Answer stays hidden until submit. */
export function ListeningTypeCard({
  exercise,
  speechLang,
  romanizationMode,
  onAnswer,
}: {
  exercise: Extract<Exercise, { kind: "listening-type" }>;
  speechLang: string;
  romanizationMode: RomanizationMode;
  onAnswer: (correct: boolean, ms: number) => void;
}) {
  void romanizationMode;
  const [answered, setAnswered] = useState(false);
  const [typed, setTyped] = useState("");
  const start = useState(() => Date.now())[0];

  useEffect(() => {
    setAnswered(false);
    setTyped("");
  }, [exercise]);

  function finish() {
    if (answered) return;
    setAnswered(true);
    onAnswer(norm(typed) === norm(exercise.answer), Date.now() - start);
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-primary">
        Type what you heard
      </p>

      <div className="mt-5 flex flex-col items-center gap-2">
        <AudioButton
          text={exercise.audioText}
          lang={speechLang}
          size="lg"
          autoPlay
          label="Play again"
          showSlow
        />
      </div>

      <div className="mt-6">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={answered}
          placeholder="Type what you heard…"
          className="input text-center text-lg"
          onKeyDown={(e) => e.key === "Enter" && finish()}
          autoFocus
        />
        {!answered && (
          <Button size="sm" className="mt-3" onClick={finish} disabled={!typed.trim()}>
            Check
          </Button>
        )}
      </div>

      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl border border-border bg-surface-2 p-4 text-center"
          >
            <p className="text-xl font-extrabold">{exercise.item.target}</p>
            <p className="text-sm text-muted">
              {exercise.item.pronunciation} · {exercise.item.translation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
