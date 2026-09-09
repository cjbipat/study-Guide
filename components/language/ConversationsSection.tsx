"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Lock, MessagesSquare } from "lucide-react";
import { useState } from "react";

import { useStore } from "@/lib/store-context";
import type { ConversationLevelBand } from "@/lib/language/conversation-types";
import { cn } from "@/lib/utils";

const LEVELS: (ConversationLevelBand | "all")[] = [
  "all",
  "beginner",
  "intermediate",
  "advanced",
];

export function ConversationsSection({ profileId }: { profileId: string }) {
  const { conversation } = useStore();
  const views = conversation.scenarios(profileId);
  const progress = conversation.progress(profileId);
  const [level, setLevel] = useState<ConversationLevelBand | "all">("all");

  if (views.length === 0) return null;

  const filtered =
    level === "all"
      ? views
      : views.filter((v) => v.scenario.level === level);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight">Conversations</h2>
        <Link
          href={`/languages/${profileId}/practice/conversation`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          All scenarios <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {progress.totalSessions > 0 && (
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <Stat value={progress.scenariosCompleted} label="Scenarios completed" />
          <Stat value={progress.wordsUsed} label="Words used" />
          {progress.streakDays > 0 && (
            <Stat value={progress.streakDays} label="Conversation streak" />
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold capitalize transition-colors",
              level === l
                ? "border-primary bg-primary/10 text-primary"
                : "border-border-strong text-muted hover:text-foreground",
            )}
          >
            {l === "all" ? "All" : l}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 6).map((v, i) => {
          const locked = v.status === "locked";
          const href = `/languages/${profileId}/practice/conversation?s=${v.scenario.id}`;
          const inner = (
            <>
              <div className="flex items-start justify-between">
                <span className="text-2xl">{v.scenario.icon}</span>
                {v.status === "completed" ? (
                  <Check className="h-4 w-4 text-success-strong dark:text-success" />
                ) : locked ? (
                  <Lock className="h-4 w-4 text-muted" />
                ) : (
                  <MessagesSquare className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="mt-2 font-bold">{v.scenario.title}</p>
              <p className="mt-0.5 text-xs text-muted">{v.scenario.tagline}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                {v.scenario.level}
                {locked
                  ? ` · learn ${v.wordsNeeded} more word${v.wordsNeeded === 1 ? "" : "s"}`
                  : ` · ~${v.scenario.estimatedMinutes} min`}
              </p>
            </>
          );
          return locked ? (
            <div
              key={v.scenario.id}
              className="flex flex-col rounded-2xl border border-border bg-surface-2/50 p-4 opacity-70"
            >
              {inner}
            </div>
          ) : (
            <motion.div
              key={v.scenario.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
            >
              <Link
                href={href}
                className="flex h-full flex-col rounded-2xl border border-border bg-surface-solid p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                {inner}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="rounded-2xl bg-surface-2 px-3 py-2">
      <span className="text-lg font-extrabold">{value}</span>{" "}
      <span className="text-xs text-muted">{label}</span>
    </span>
  );
}
