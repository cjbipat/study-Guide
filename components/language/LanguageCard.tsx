"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Flame } from "lucide-react";

import type { LanguageProfileWithMeta } from "@/lib/language/store";
import { cn } from "@/lib/utils";

export function LanguageCard({
  meta,
  index = 0,
}: {
  meta: LanguageProfileWithMeta;
  index?: number;
}) {
  const { profile, language, progress } = meta;
  const vocabScore = progress.skills.vocabulary.score;
  const started = progress.vocabByState.new < progress.vocabTotal;

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
    >
      <Link
        href={`/languages/${profile.id}`}
        className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-surface-solid p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{language.flag}</span>
            <div>
              <p className="text-lg font-extrabold">{language.name}</p>
              <p className="text-xs text-muted">{language.nativeName}</p>
            </div>
          </div>
          {profile.streak > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-bold text-accent">
              <Flame className="h-3.5 w-3.5" /> {profile.streak}
            </span>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted">
              {started ? "Vocabulary" : "Just started"}
            </span>
            {vocabScore !== null && (
              <span className="text-foreground">{vocabScore}%</span>
            )}
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-500"
              style={{ width: `${vocabScore ?? 0}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs font-semibold text-muted">
          <span>{progress.vocabTotal} words</span>
          {progress.dueCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="text-primary">{progress.dueCount} due</span>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-2">
            {progress.overall === null
              ? "New"
              : `${progress.overall}% overall`}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:gap-1.5">
            {started ? "Continue" : "Start Learning"}
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
