"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { themeTokens } from "@/lib/deck-theme";
import type { DeckTheme } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CardFeedback = "correct" | "incorrect" | null;

export function Flashcard({
  question,
  answer,
  revealed,
  feedback = null,
  theme = "violet",
  tags,
  className,
  minHeight = "min-h-[300px] sm:min-h-[360px]",
  footer,
  onClick,
}: {
  question: string;
  answer: string;
  revealed: boolean;
  feedback?: CardFeedback;
  theme?: DeckTheme;
  tags?: string[];
  className?: string;
  minHeight?: string;
  footer?: React.ReactNode;
  onClick?: () => void;
}) {
  const tk = themeTokens(theme);

  return (
    <motion.div
      onClick={onClick}
      animate={
        feedback === "incorrect"
          ? { x: [0, -9, 8, -6, 4, 0] }
          : feedback === "correct"
            ? { scale: [1, 1.035, 1] }
            : { x: 0, scale: 1 }
      }
      transition={{ duration: feedback ? 0.42 : 0.2 }}
      className={cn(
        "group relative w-full overflow-hidden rounded-[2rem] border bg-surface-solid p-7 text-left shadow-soft sm:p-9",
        feedback === "correct" && "border-success/60 shadow-glow-success",
        feedback === "incorrect" && "border-accent/60",
        !feedback && "border-border",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {/* accent wash */}
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br opacity-15 blur-2xl transition-opacity group-hover:opacity-25",
          tk.gradient,
        )}
      />

      <div className={cn("relative flex flex-col", minHeight)}>
        <div className="mb-4 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest",
              tk.chip,
            )}
          >
            Question
          </span>
          {tags && tags.length > 0 && (
            <span className="truncate text-xs text-muted">
              {tags.slice(0, 3).map((t) => `#${t}`).join("  ")}
            </span>
          )}
        </div>

        <p className="text-balance text-xl font-bold leading-snug text-foreground sm:text-2xl">
          {question}
        </p>

        <AnimatePresence initial={false}>
          {revealed && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <div className="my-5 h-px w-full bg-border" />
              <span
                className={cn(
                  "mb-2 inline-flex items-center gap-1.5 rounded-full bg-success/14 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-success-strong dark:text-success",
                )}
              >
                <Sparkles className="h-3 w-3" /> Answer
              </span>
              <p className="text-pretty text-lg font-medium leading-relaxed text-foreground/90 sm:text-xl">
                {answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto pt-6">{footer}</div>
      </div>
    </motion.div>
  );
}
