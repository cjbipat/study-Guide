"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Keyboard } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AudioButton } from "@/components/language/AudioButton";
import { Button } from "@/components/ui/Button";
import type { ReviewGrade } from "@/lib/language/scheduler";
import type { RomanizationMode } from "@/lib/language/types";
import {
  normalizeAnswer,
  type VocabularyExercise,
} from "@/lib/language/vocabulary-exercises";
import { cn } from "@/lib/utils";

const GRADES: { grade: ReviewGrade; label: string; hint: string; cls: string }[] =
  [
    { grade: "again", label: "Again", hint: "1", cls: "border-accent/50 text-accent hover:bg-accent/10" },
    { grade: "hard", label: "Hard", hint: "2", cls: "border-warning/50 text-warning hover:bg-warning/10" },
    { grade: "good", label: "Good", hint: "3", cls: "border-primary/50 text-primary hover:bg-primary/10" },
    { grade: "easy", label: "Easy", hint: "4", cls: "border-success/50 text-success-strong dark:text-success hover:bg-success/10" },
  ];

/**
 * Active-recall vocabulary card.
 *
 * PHASE 1 — the question only. No meaning, no pinyin, no example that gives it
 * away. "Show Answer" (or an optional typed attempt).
 * PHASE 2 — animated reveal, then "How well did you remember?" → the scheduler.
 */
export function VocabRecallCard({
  exercise,
  speechLang,
  romanizationMode,
  onGraded,
}: {
  exercise: VocabularyExercise;
  speechLang: string;
  romanizationMode: RomanizationMode;
  onGraded: (grade: ReviewGrade, ms: number) => void;
  /** kept for signature parity with other cards */
}) {
  void romanizationMode;
  const [phase, setPhase] = useState<"question" | "revealed">("question");
  const [showType, setShowType] = useState(false);
  const [typed, setTyped] = useState("");
  const [typedResult, setTypedResult] = useState<"match" | "unknown" | null>(
    null,
  );
  const start = useState(() => Date.now())[0];

  useEffect(() => {
    setPhase("question");
    setShowType(false);
    setTyped("");
    setTypedResult(null);
  }, [exercise]);

  const { reveal } = exercise;
  const accepted = useMemo(
    () => exercise.acceptedAnswers.map(normalizeAnswer).filter(Boolean),
    [exercise],
  );

  const doReveal = useCallback(() => {
    if (phase === "revealed") return;
    setPhase("revealed");
  }, [phase]);

  const checkTyped = useCallback(() => {
    if (!typed.trim() || phase === "revealed") return;
    const ok = accepted.includes(normalizeAnswer(typed));
    setTypedResult(ok ? "match" : "unknown");
    setPhase("revealed");
  }, [typed, accepted, phase]);

  const grade = useCallback(
    (g: ReviewGrade) => {
      if (phase !== "revealed") return;
      onGraded(g, Date.now() - start);
    },
    [phase, onGraded, start],
  );

  // keyboard: Space → Show Answer · Enter → Check · 1–4 → grade
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";
      if (phase === "question") {
        if (typing) {
          if (e.key === "Enter") {
            e.preventDefault();
            checkTyped();
          }
          return;
        }
        if (e.code === "Space" || e.key === " ") {
          e.preventDefault();
          doReveal();
        }
        return;
      }
      // revealed
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        grade(GRADES[Number(e.key) - 1].grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, doReveal, checkTyped, grade]);

  /* ---------------- PHASE 1 ---------------- */
  if (phase === "question") {
    return (
      <div className="flex flex-col items-center text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
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
            <p className="mt-3 text-xl font-extrabold sm:text-2xl">
              {exercise.question}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-2xl font-extrabold leading-snug sm:text-3xl">
            {exercise.question}
          </p>
        )}

        <p className="mt-3 text-sm text-muted">Take a moment to remember.</p>

        <div className="mt-7 w-full max-w-sm">
          {!showType ? (
            <>
              <Button size="lg" className="w-full" onClick={doReveal}>
                Show Answer
              </Button>
              <button
                type="button"
                onClick={() => setShowType(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
              >
                <Keyboard className="h-4 w-4" /> Type your answer
              </button>
              <p className="mt-3 text-[11px] text-muted-2">
                Press <kbd className="rounded bg-foreground/10 px-1">Space</kbd>{" "}
                to reveal
              </p>
            </>
          ) : (
            <div>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    checkTyped();
                  }
                }}
                placeholder={
                  exercise.typeExpects === "target"
                    ? "Type the word…"
                    : "Type the meaning…"
                }
                className="input w-full text-center text-lg"
                autoFocus
              />
              <div className="mt-3 flex gap-2">
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={!typed.trim()}
                  onClick={checkTyped}
                >
                  Check Answer
                </Button>
                <Button size="lg" variant="ghost" onClick={doReveal}>
                  Skip
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------------- PHASE 2 ---------------- */
  return (
    <div className="text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
      >
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold tracking-tight sm:text-5xl"
        >
          {reveal.target}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mt-2 text-lg font-medium text-muted"
        >
          {reveal.pronunciation}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-1 text-xl font-bold"
        >
          {reveal.translation}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32 }}
          className="mt-4 flex justify-center"
        >
          <AudioButton
            text={reveal.target}
            lang={speechLang}
            size="sm"
            label="Listen again"
            showSlow
          />
        </motion.div>

        {reveal.example && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto mt-4 max-w-md rounded-2xl border border-border bg-surface-2 p-3 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{reveal.example}</p>
              <AudioButton text={reveal.example} lang={speechLang} size="sm" />
            </div>
            {reveal.examplePronunciation && (
              <p className="mt-0.5 text-xs text-muted">
                {reveal.examplePronunciation}
              </p>
            )}
            {reveal.exampleTranslation && (
              <p className="mt-0.5 text-sm text-muted">
                “{reveal.exampleTranslation}”
              </p>
            )}
          </motion.div>
        )}

        {typedResult && (
          <p
            className={cn(
              "mt-3 text-sm font-semibold",
              typedResult === "match"
                ? "text-success-strong dark:text-success"
                : "text-muted",
            )}
          >
            You typed “{typed.trim()}” —{" "}
            {typedResult === "match"
              ? "that matches."
              : "compare it with the answer and rate yourself honestly."}
          </p>
        )}
      </motion.div>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-7"
        >
          <p className="text-sm font-bold">How well did you remember?</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <button
                key={g.grade}
                onClick={() => grade(g.grade)}
                className={cn(
                  "flex flex-col items-center rounded-2xl border-2 py-2.5 font-bold transition-colors",
                  g.cls,
                )}
              >
                {g.label}
                <span className="mt-0.5 text-[10px] font-semibold text-muted-2">
                  {g.hint}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
