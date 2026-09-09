"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Globe, Play } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store-context";
import { buildSessionPlan } from "@/lib/language/session";
import { cn } from "@/lib/utils";

export function YourLanguages() {
  const { snapshot, lang } = useStore();
  const profiles = lang.profiles;

  if (profiles.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold">Languages</h2>
        <div className="flex flex-col items-start gap-3 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-blue-500/8 via-surface-solid to-emerald-500/8 p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Learn a language alongside your studies</p>
            <p className="mt-1 text-sm text-muted">
              Vocabulary, listening, speaking, reading and writing — with spaced
              review and streaks.
            </p>
          </div>
          <Button href="/languages" size="lg" className="shrink-0">
            <Globe className="h-4 w-4" /> Start a Language
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Languages</h2>
        <Link
          href="/languages"
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          All languages <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.slice(0, 3).map((m, i) => {
          const plan = buildSessionPlan(snapshot, m.profile);
          const vocabScore = m.progress.skills.vocabulary.score;
          return (
            <motion.div
              key={m.profile.id}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col rounded-3xl border border-border bg-surface-solid p-5 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-2xl">{m.language.flag}</span>
                  <span className="font-bold">{m.language.name}</span>
                </span>
                {m.profile.streak > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-accent">
                    <Flame className="h-3.5 w-3.5" /> {m.profile.streak}
                  </span>
                )}
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  style={{ width: `${vocabScore ?? 0}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-muted">
                Today&apos;s session · ~{plan.totalMinutes} min
                {plan.dueVocab > 0 && ` · ${plan.dueVocab} due`}
              </p>

              <Button
                href={`/languages/${m.profile.id}/session`}
                size="sm"
                className="mt-4 self-start"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Continue
              </Button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
