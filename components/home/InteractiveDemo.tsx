"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Flashcard, type CardFeedback } from "@/components/cards/Flashcard";
import { useFireworks } from "@/components/fireworks/fireworks-context";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { DeckTheme } from "@/lib/types";

const DEMO_CARDS: { q: string; a: string; theme: DeckTheme }[] = [
  {
    q: "What is spaced repetition?",
    a: "A learning technique where reviews are scheduled at increasing intervals, timed to just before you'd forget.",
    theme: "violet",
  },
  {
    q: "In music theory, how many semitones are in an octave?",
    a: "Twelve. Each semitone is the smallest interval in Western tuning.",
    theme: "blue",
  },
  {
    q: "What does the 'S' in HTTPS stand for?",
    a: "Secure — the connection is encrypted with TLS, protecting data in transit.",
    theme: "emerald",
  },
];

export function InteractiveDemo() {
  const { celebrate } = useFireworks();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<CardFeedback>(null);
  const [xp, setXp] = useState(0);
  const [locked, setLocked] = useState(false);
  const [missed, setMissed] = useState(false);

  const finished = index >= DEMO_CARDS.length;
  const card = DEMO_CARDS[Math.min(index, DEMO_CARDS.length - 1)];

  function next() {
    setRevealed(false);
    setFeedback(null);
    setLocked(false);
    setMissed(false);
    setIndex((i) => i + 1);
  }

  function answer(correct: boolean) {
    if (locked) return;
    setLocked(true);
    if (correct) {
      setFeedback("correct");
      setXp((x) => x + 10);
      celebrate({ intensity: "medium", originYRatio: 0.5 });
      setTimeout(next, 1400);
    } else {
      setFeedback("incorrect");
      setMissed(true);
      setTimeout(() => setFeedback(null), 700);
    }
  }

  function restart() {
    setIndex(0);
    setRevealed(false);
    setFeedback(null);
    setXp(0);
    setLocked(false);
    setMissed(false);
  }

  return (
    <section id="demo" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            See how it works
          </p>
          <h2 className="mt-3 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Try a round right here
          </h2>
          <p className="mt-4 text-lg text-muted">
            No sign-up. Reveal the answer, be honest about whether you knew it,
            and watch what happens when you get one right.
          </p>
        </div>

        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between text-sm font-semibold text-muted">
            <span>
              {finished
                ? "Session complete"
                : `Card ${index + 1} of ${DEMO_CARDS.length}`}
            </span>
            <span className="text-primary">{xp} XP</span>
          </div>
          <ProgressBar
            value={finished ? DEMO_CARDS.length : index}
            max={DEMO_CARDS.length}
            className="mb-8"
          />

          <AnimatePresence mode="wait">
            {finished ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-[2rem] border border-border bg-surface-solid p-10 text-center shadow-soft"
              >
                <div className="text-5xl">🎉</div>
                <h3 className="mt-4 text-2xl font-extrabold">
                  That&apos;s the whole loop
                </h3>
                <p className="mt-2 text-muted">
                  You earned {xp} XP. Imagine that across a real deck, every day.
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button href="/get-started" size="lg">
                    Build your first deck <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={restart}>
                    <RotateCcw className="h-4 w-4" /> Run it again
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
              >
                <Flashcard
                  theme={card.theme}
                  question={card.q}
                  answer={card.a}
                  revealed={revealed}
                  feedback={feedback}
                  onClick={() => !revealed && setRevealed(true)}
                  footer={
                    !revealed ? (
                      <Button
                        variant="outline"
                        onClick={() => setRevealed(true)}
                        className="w-full"
                      >
                        Show Answer
                      </Button>
                    ) : missed ? (
                      <Button
                        variant="primary"
                        onClick={next}
                        className="w-full"
                      >
                        Continue <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => answer(false)}
                          disabled={locked}
                        >
                          Missed it
                        </Button>
                        <Button
                          variant="success"
                          onClick={() => answer(true)}
                          disabled={locked}
                        >
                          Got it right
                        </Button>
                      </div>
                    )
                  }
                />
                <AnimatePresence>
                  {feedback === "incorrect" && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 text-center text-sm font-semibold text-accent"
                    >
                      Not quite — no worries. Give it another look, then continue.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
