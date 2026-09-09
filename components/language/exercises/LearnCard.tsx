"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { AudioButton } from "@/components/language/AudioButton";
import { Romanization } from "@/components/language/Romanization";
import { Button } from "@/components/ui/Button";
import type { Exercise } from "@/lib/language/exercises";
import type { ReviewGrade } from "@/lib/language/scheduler";
import type { RomanizationMode } from "@/lib/language/types";
import { cn } from "@/lib/utils";

const GRADES: { grade: ReviewGrade; label: string }[] = [
  { grade: "again", label: "Again" },
  { grade: "hard", label: "Hard" },
  { grade: "good", label: "Good" },
  { grade: "easy", label: "Easy" },
];

/** New-word introduction: see it, hear it, then a first active recall. */
export function LearnCard({
  exercise,
  speechLang,
  romanizationMode,
  onGraded,
}: {
  exercise: Extract<Exercise, { kind: "learn" }>;
  speechLang: string;
  romanizationMode: RomanizationMode;
  onGraded: (grade: ReviewGrade, ms: number) => void;
}) {
  const { item } = exercise;
  const [phase, setPhase] = useState<"intro" | "ask" | "reveal">("intro");
  const start = useState(() => Date.now())[0];

  useEffect(() => setPhase("intro"), [exercise]);

  const grade = useCallback(
    (g: ReviewGrade) => onGraded(g, Date.now() - start),
    [onGraded, start],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      if (phase === "intro" && (e.code === "Space" || e.key === " ")) {
        e.preventDefault();
        setPhase("ask");
      } else if (phase === "ask" && (e.code === "Space" || e.key === " ")) {
        e.preventDefault();
        setPhase("reveal");
      } else if (phase === "reveal" && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        grade(GRADES[Number(e.key) - 1].grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, grade]);

  /* ---- first recall ---- */
  if (phase === "ask" || phase === "reveal") {
    return (
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Quick check
        </p>
        <p className="mt-4 text-2xl font-extrabold sm:text-3xl">
          What does {item.target} mean?
        </p>

        {phase === "ask" ? (
          <>
            <p className="mt-3 text-sm text-muted">Take a moment to remember.</p>
            <Button
              size="lg"
              className="mx-auto mt-7 w-full max-w-sm"
              onClick={() => setPhase("reveal")}
            >
              Show Answer
            </Button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
          >
            <p className="text-3xl font-extrabold">{item.target}</p>
            <p className="mt-1 text-muted">{item.pronunciation}</p>
            <p className="mt-1 text-lg font-bold">{item.translation}</p>
            <div className="mt-3 flex justify-center">
              <AudioButton
                text={item.target}
                lang={speechLang}
                size="sm"
                label="Listen again"
                showSlow
              />
            </div>
            <p className="mt-6 text-sm font-bold">How well did you remember?</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  onClick={() => grade(g.grade)}
                  className={cn(
                    "rounded-2xl border-2 py-2.5 font-bold transition-colors",
                    g.grade === "again"
                      ? "border-accent/50 text-accent hover:bg-accent/10"
                      : g.grade === "hard"
                        ? "border-warning/50 text-warning hover:bg-warning/10"
                        : g.grade === "good"
                          ? "border-primary/50 text-primary hover:bg-primary/10"
                          : "border-success/50 text-success-strong dark:text-success hover:bg-success/10",
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  /* ---- introduction ---- */
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-primary">
        New word
      </p>
      <p className="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl">
        {item.target}
      </p>
      <div className="mt-3">
        <Romanization
          text={item.pronunciation}
          mode={romanizationMode === "hidden" ? "always" : romanizationMode}
          size="lg"
        />
      </div>
      <p className="mt-1 text-lg text-muted">{item.translation}</p>
      <div className="mt-5 flex justify-center">
        <AudioButton
          text={item.target}
          lang={speechLang}
          size="lg"
          autoPlay
          label="Play"
          showSlow
        />
      </div>
      {item.exampleSentence && (
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-border bg-surface-2 p-4 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{item.exampleSentence}</p>
            <AudioButton text={item.exampleSentence} lang={speechLang} size="sm" />
          </div>
          {item.examplePronunciation && (
            <Romanization
              text={item.examplePronunciation}
              mode={romanizationMode === "hidden" ? "always" : romanizationMode}
              size="sm"
              className="mt-1 block"
            />
          )}
          {item.exampleTranslation && (
            <p className="mt-1 text-sm text-muted">{item.exampleTranslation}</p>
          )}
        </div>
      )}
      <Button size="lg" className="mt-7" onClick={() => setPhase("ask")}>
        Got it <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
