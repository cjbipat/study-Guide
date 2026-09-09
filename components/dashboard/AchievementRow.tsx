"use client";

import { motion } from "framer-motion";

import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from "@/lib/achievements";
import type { UnlockedAchievement } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

export function AchievementRow({ unlocked }: { unlocked: UnlockedAchievement[] }) {
  const unlockedIds = new Set(unlocked.map((u) => u.id));
  const recent = [...unlocked]
    .sort((a, b) => Date.parse(b.unlockedAt) - Date.parse(a.unlockedAt))
    .slice(0, 4);
  const nextUp = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id)).slice(0, 4 - recent.length);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
      {recent.map((u, i) => {
        const def = ACHIEVEMENT_MAP[u.id];
        if (!def) return null;
        return (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex min-w-[190px] flex-1 items-center gap-3 rounded-2xl border border-border bg-surface-solid p-4 shadow-soft"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-2xl">
              {def.icon}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{def.title}</p>
              <p className="text-xs text-muted">
                {formatRelativeTime(u.unlockedAt)}
              </p>
            </div>
          </motion.div>
        );
      })}
      {nextUp.map((def) => (
        <div
          key={def.id}
          className={cn(
            "flex min-w-[190px] flex-1 items-center gap-3 rounded-2xl border border-dashed border-border p-4",
          )}
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-foreground/5 text-2xl opacity-40 grayscale">
            {def.icon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-muted">{def.title}</p>
            <p className="text-xs text-muted-2">Locked</p>
          </div>
        </div>
      ))}
    </div>
  );
}
