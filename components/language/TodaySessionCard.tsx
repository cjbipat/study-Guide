"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Flame, Play } from "lucide-react";

import { MODE_LABEL } from "@/components/language/mode-meta";
import type { TodaySessionPlan } from "@/lib/language/types";

export function TodaySessionCard({
  profileId,
  plan,
  streak,
}: {
  profileId: string;
  plan: TodaySessionPlan;
  streak: number;
}) {
  const lines: string[] = [];
  if (plan.dueVocab > 0)
    lines.push(`${plan.dueVocab} word${plan.dueVocab === 1 ? "" : "s"} to review`);
  if (plan.newVocab > 0)
    lines.push(`${Math.min(plan.newVocab, 8)} new word${plan.newVocab === 1 ? "" : "s"}`);
  lines.push(`${plan.listeningItems} listening`);
  if (plan.speakingItems > 0) lines.push(`${plan.speakingItems} speaking`);
  lines.push(`${plan.challengeItems}-word challenge`);

  return (
    <motion.div
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-blue-600 p-6 text-white shadow-glow sm:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">
            Today&apos;s session
          </p>
          {streak > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">
              <Flame className="h-3.5 w-3.5" /> {streak} day streak
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {plan.blocks.map((b, i) => (
            <span
              key={i}
              className="rounded-full bg-white/12 px-2.5 py-1 text-xs font-semibold"
            >
              {i + 1}. {b.label}
            </span>
          ))}
        </div>

        <ul className="mt-4 space-y-1 text-sm text-white/90">
          {lines.map((l) => (
            <li key={l} className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-white/70" />
              {l}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={`/languages/${profileId}/session`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-violet-700 transition-transform hover:scale-105"
          >
            <Play className="h-4 w-4 fill-current" /> Start Today&apos;s Session
          </Link>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-white/85">
            <Clock className="h-4 w-4" /> ~{plan.totalMinutes} min
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export { MODE_LABEL };
