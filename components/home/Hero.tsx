"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Flame, Sparkles, Target } from "lucide-react";
import { useState } from "react";

import { Flashcard } from "@/components/cards/Flashcard";
import { useFireworks } from "@/components/fireworks/fireworks-context";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function Hero() {
  const { celebrate } = useFireworks();
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const float = reduce
    ? {}
    : {
        animate: { y: [0, -12, 0], rotate: [-1, 1, -1] },
        transition: {
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };

  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-40 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-8">
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-solid px-3.5 py-1.5 text-xs font-semibold text-muted lg:mx-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Spaced repetition, reimagined
          </motion.div>

          <motion.h1
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-5xl font-extrabold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Remember more.{" "}
            <span className="text-gradient">Learn smarter.</span>
          </motion.h1>

          <motion.p
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted lg:mx-0"
          >
            Turn studying into a habit you actually enjoy. Build powerful
            flashcard decks, master difficult concepts, and celebrate every win.
          </motion.p>

          <motion.div
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, delay: 0.19 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
          >
            <Button href="/get-started" size="lg" className="w-full sm:w-auto">
              Start Learning <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              href="/#demo"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              Explore Demo
            </Button>
          </motion.div>

          <div className="mt-8 flex items-center justify-center gap-5 text-sm text-muted lg:justify-start">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-success" /> Free to start
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-success" /> No card limits
            </span>
          </div>
        </div>

        {/* Interactive floating card */}
        <div className="relative mx-auto w-full max-w-md px-1 sm:px-0">
          <FloatingBadge
            className="-top-4 left-2 sm:-left-6"
            delay={0.5}
            reduce={!!reduce}
            icon={<Check className="h-3.5 w-3.5" />}
            tone="success"
          >
            +1 Correct
          </FloatingBadge>
          <FloatingBadge
            className="-top-4 right-2 sm:-right-6"
            delay={0.8}
            reduce={!!reduce}
            icon={<Target className="h-3.5 w-3.5" />}
            tone="primary"
          >
            87% Mastery
          </FloatingBadge>
          <FloatingBadge
            className="-bottom-4 left-6 sm:-left-8"
            delay={1.1}
            reduce={!!reduce}
            icon={<Flame className="h-3.5 w-3.5" />}
            tone="accent"
          >
            12 day streak
          </FloatingBadge>

          <motion.div
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, type: "spring", stiffness: 90 }}
          >
            <motion.div {...float}>
              <Flashcard
                theme="violet"
                question="What is the powerhouse of the cell?"
                answer="The mitochondria — it generates most of the cell's ATP through aerobic respiration."
                revealed={revealed}
                feedback={done ? "correct" : null}
                onClick={() => !revealed && setRevealed(true)}
                minHeight="min-h-[280px]"
                footer={
                  !revealed ? (
                    <div className="text-sm font-semibold text-muted">
                      Tap the card to reveal the answer →
                    </div>
                  ) : done ? (
                    <div className="flex items-center gap-2 text-sm font-bold text-success">
                      <Sparkles className="h-4 w-4" /> +10 XP · nice work
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRevealed(false);
                          setDone(false);
                        }}
                      >
                        Again
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          setDone(true);
                          celebrate({ intensity: "high", originXRatio: 0.72 });
                        }}
                      >
                        I knew it <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                }
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FloatingBadge({
  children,
  className,
  delay,
  icon,
  tone,
  reduce,
}: {
  children: React.ReactNode;
  className?: string;
  delay: number;
  icon: React.ReactNode;
  tone: "success" | "primary" | "accent";
  reduce: boolean;
}) {
  const tones = {
    success: "text-success-strong dark:text-success",
    primary: "text-primary",
    accent: "text-accent",
  };
  return (
    <motion.div
      initial={{ scale: 0.85 }}
      animate={
        reduce ? { scale: 1 } : { scale: 1, y: [0, -8, 0] }
      }
      transition={
        reduce
          ? { delay }
          : {
              scale: { delay, duration: 0.4, type: "spring" },
              y: {
                delay: delay + 0.4,
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }
      }
      className={cn(
        "absolute z-10 flex items-center gap-1.5 rounded-full border border-border bg-surface-solid px-3 py-1.5 text-xs font-bold shadow-soft",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </motion.div>
  );
}
