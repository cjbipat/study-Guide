"use client";

import { useMemo, useState } from "react";
import { Flame, Zap } from "lucide-react";

import { NextBestStep } from "@/components/learning/NextBestStep";
import { TodaysPlan } from "@/components/learning/TodaysPlan";
import { ContinueLearning } from "@/components/learning/ContinueLearning";
import { UniversalProgress } from "@/components/learning/UniversalProgress";
import { RecentProgress } from "@/components/learning/RecentProgress";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/lib/store-context";
import { greeting } from "@/lib/utils";
import { levelFromXp } from "@/lib/xp";

export default function DashboardPage() {
  const { ready, snapshot, learning } = useStore();
  const [skips, setSkips] = useState(0);

  const recommendations = useMemo(
    () => (ready ? learning.recommendations() : []),
    [ready, learning],
  );
  const areas = useMemo(() => (ready ? learning.areas() : []), [ready, learning]);
  const recent = useMemo(
    () => (ready ? learning.recentProgress(6) : []),
    [ready, learning],
  );

  if (!ready) return <PageSkeleton />;

  const stats = snapshot.stats;
  const { level, progress } = levelFromXp(stats.totalXp);

  const nextStep =
    recommendations.length > 0
      ? recommendations[skips % recommendations.length]
      : learning.nextBestAction();

  // "Continue learning" = areas that still have something to do
  const continueAreas = areas
    .filter(
      (a) =>
        a.mastery.label !== "strong" ||
        a.meta.some((m) => m.includes("due")),
    )
    .sort((a, b) => {
      const aDue = a.meta.some((m) => m.includes("due")) ? 1 : 0;
      const bDue = b.meta.some((m) => m.includes("due")) ? 1 : 0;
      return bDue - aDue;
    })
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      {/* 1. Welcome */}
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {greeting()}, {snapshot.user.name.split(" ")[0]}.
        </h1>
        <p className="mt-1 text-muted">Let&apos;s keep your learning moving.</p>
      </header>

      {/* 2. Your next best step */}
      <NextBestStep
        recommendation={nextStep}
        onSkip={
          recommendations.length > 1 ? () => setSkips((s) => s + 1) : undefined
        }
      />

      {/* 3. Today's plan */}
      <TodaysPlan />

      {/* 4. Continue learning */}
      <ContinueLearning areas={continueAreas} />

      {/* 5. Your progress — every area, separately */}
      <UniversalProgress areas={areas} />

      {/* 6. Recent progress */}
      <RecentProgress items={recent} />

      {/* Streak / level strip */}
      <section className="mt-10 flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-surface-solid p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/12 text-accent">
            <Flame className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <div className="text-xl font-extrabold">{stats.currentStreak} days</div>
            <p className="text-xs text-muted">Current streak · best {stats.longestStreak}</p>
          </div>
        </div>
        <div className="hidden h-10 w-px bg-border sm:block" />
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Zap className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <div className="text-xl font-extrabold">Level {level}</div>
            <p className="text-xs text-muted">{Math.round(progress * 100)}% to next level</p>
          </div>
        </div>
        <Button href="/achievements" variant="outline" size="sm" className="ml-auto">
          View achievements
        </Button>
      </section>
    </div>
  );
}
