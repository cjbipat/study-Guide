"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, Flame, Play } from "lucide-react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { themeTokens } from "@/lib/deck-theme";
import type { DeckWithMeta } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

export function DeckCard({ deck, index = 0 }: { deck: DeckWithMeta; index?: number }) {
  const tk = themeTokens(deck.theme);
  const streakish = deck.mastery >= 60 && deck.lastStudiedAt;

  return (
    <motion.div
      initial={{ y: 18 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        href={`/decks/${deck.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface-solid p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br opacity-15 blur-2xl transition-opacity group-hover:opacity-30",
            tk.gradient,
          )}
        />
        <div className="relative flex items-start justify-between">
          <div
            className={cn(
              "grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-2xl shadow-soft",
              tk.gradient,
            )}
          >
            <span>{deck.icon}</span>
          </div>
          {streakish && (
            <span className="flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-bold text-accent">
              <Flame className="h-3.5 w-3.5" /> On track
            </span>
          )}
        </div>

        <h3 className="relative mt-4 text-xl font-bold">{deck.name}</h3>
        <p className="relative mt-1 line-clamp-2 text-sm text-muted">
          {deck.description || "No description yet."}
        </p>

        <div className="relative mt-4 flex items-center gap-3 text-xs font-semibold text-muted">
          <span>{deck.cardCount} cards</span>
          <span aria-hidden>·</span>
          <span>{deck.mastery}% mastery</span>
          {deck.dueCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className={tk.text}>{deck.dueCount} due</span>
            </>
          )}
          {deck.materialCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {deck.materialCount}
              </span>
            </>
          )}
        </div>

        <div className="relative mt-3">
          <ProgressBar
            value={deck.mastery}
            gradient={tk.bar}
            ariaLabel={`${deck.name} mastery ${deck.mastery} percent`}
          />
        </div>

        <div className="relative mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-2">
            {deck.lastStudiedAt
              ? `Studied ${formatRelativeTime(deck.lastStudiedAt)}`
              : "Not started"}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white transition-transform group-hover:scale-105",
              "bg-gradient-to-r",
              tk.gradient,
            )}
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Study
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
