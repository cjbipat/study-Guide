"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

import { PageHeader } from "@/components/navigation/AppShell";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { useStore } from "@/lib/store-context";
import { levelFromXp } from "@/lib/xp";
import { cn, formatRelativeTime, pct } from "@/lib/utils";

export default function AchievementsPage() {
  const { snapshot, ready } = useStore();

  if (!ready) return <PageSkeleton />;

  const stats = snapshot.stats;
  const unlockedMap = new Map(stats.unlocked.map((u) => [u.id, u.unlockedAt]));
  const unlockedCount = stats.unlocked.length;
  const { level, progress, intoLevel, span } = levelFromXp(stats.totalXp);

  const overallAccuracy = pct(stats.totalCorrect, stats.totalReviews);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <PageHeader
        title="Achievements"
        subtitle={`${unlockedCount} of ${ACHIEVEMENTS.length} unlocked`}
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface-solid p-5 shadow-soft">
          <ProgressRing value={progress * 100} size={68}>
            <span className="text-sm font-extrabold">{ready ? level : "—"}</span>
          </ProgressRing>
          <div>
            <p className="text-sm font-bold">Level {ready ? level : "—"}</p>
            <p className="text-xs text-muted">
              {intoLevel}/{span} XP to next
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-surface-solid p-5 shadow-soft">
          <p className="text-2xl font-extrabold">
            {stats.totalReviews.toLocaleString()}
          </p>
          <p className="text-sm text-muted">Lifetime reviews</p>
        </div>
        <div className="rounded-3xl border border-border bg-surface-solid p-5 shadow-soft">
          <p className="text-2xl font-extrabold">{overallAccuracy}%</p>
          <p className="text-sm text-muted">Lifetime accuracy</p>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a, i) => {
          const unlockedAt = unlockedMap.get(a.id);
          const unlocked = Boolean(unlockedAt);
          return (
            <motion.div
              key={a.id}
              initial={{ y: 16 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
              className={cn(
                "relative overflow-hidden rounded-3xl border p-6 shadow-soft",
                unlocked
                  ? "border-border bg-surface-solid"
                  : "border-dashed border-border bg-surface-2",
              )}
            >
              {unlocked && a.major && (
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-violet-500 to-amber-400 opacity-20 blur-2xl" />
              )}
              <div
                className={cn(
                  "relative grid h-14 w-14 place-items-center rounded-2xl text-3xl",
                  unlocked ? "bg-primary/12" : "bg-foreground/5 opacity-40 grayscale",
                )}
              >
                {unlocked ? a.icon : <Lock className="h-6 w-6 text-muted" />}
              </div>
              <h3
                className={cn(
                  "relative mt-4 font-bold",
                  !unlocked && "text-muted",
                )}
              >
                {a.title}
                {a.major && (
                  <span className="ml-2 rounded-md bg-accent/12 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
                    Milestone
                  </span>
                )}
              </h3>
              <p className="relative mt-1 text-sm text-muted">{a.description}</p>
              <p className="relative mt-3 text-xs font-semibold text-muted-2">
                {unlocked
                  ? `Unlocked ${formatRelativeTime(unlockedAt!)}`
                  : "Locked"}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
