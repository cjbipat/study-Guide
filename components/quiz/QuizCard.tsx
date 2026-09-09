"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

import type { QuizWithMeta } from "@/lib/quiz/types";
import { cn, formatRelativeTime } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  material: "Study material",
  deck: "Flashcard deck",
  language: "Language",
  manual: "Manual quiz",
};

export function QuizCard({ meta, index = 0 }: { meta: QuizWithMeta; index?: number }) {
  const { quiz, lastAttempt, bestScore, attemptCount } = meta;
  const taken = lastAttempt !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.25) }}
      className="flex flex-col rounded-3xl border border-border bg-surface-solid p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-3xl">{quiz.source.icon}</span>
        {quiz.status === "draft" && (
          <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[11px] font-bold text-warning">
            Draft
          </span>
        )}
      </div>

      <h3 className="mt-3 text-lg font-extrabold leading-tight tracking-tight">
        {quiz.title}
      </h3>
      <p className="mt-0.5 text-xs font-semibold text-muted-2">
        {SOURCE_LABEL[quiz.source.type]} · {quiz.questions.length} question
        {quiz.questions.length === 1 ? "" : "s"}
      </p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {taken ? "Last score" : "Not taken"}
          </p>
          {taken ? (
            <p
              className={cn(
                "text-2xl font-extrabold",
                lastAttempt!.score >= 80
                  ? "text-success-strong dark:text-success"
                  : lastAttempt!.score >= 50
                    ? "text-warning"
                    : "text-accent",
              )}
            >
              {lastAttempt!.score}%
            </p>
          ) : (
            <p className="text-2xl font-extrabold text-muted-2">—</p>
          )}
          {taken && (
            <p className="mt-0.5 text-[11px] text-muted-2">
              {formatRelativeTime(lastAttempt!.finishedAt)}
              {bestScore !== null && bestScore !== lastAttempt!.score
                ? ` · best ${bestScore}%`
                : ""}
              {attemptCount > 1 ? ` · ${attemptCount} attempts` : ""}
            </p>
          )}
        </div>

        <Link
          href={quiz.questions.length ? `/quizzes/${quiz.id}` : `/quizzes/create?edit=${quiz.id}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-105"
        >
          {quiz.questions.length === 0 ? (
            <>Edit</>
          ) : taken ? (
            <>
              Continue <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" /> Start
            </>
          )}
        </Link>
      </div>
    </motion.div>
  );
}
