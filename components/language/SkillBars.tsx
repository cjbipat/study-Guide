"use client";

import { motion } from "framer-motion";

import { SKILL_META } from "@/components/language/language-theme";
import { ALL_SKILLS } from "@/lib/language/progress";
import type { LanguageProgress } from "@/lib/language/types";
import { cn } from "@/lib/utils";

export function SkillBars({
  progress,
  compact = false,
}: {
  progress: LanguageProgress;
  compact?: boolean;
}) {
  const skills = compact
    ? ALL_SKILLS.filter((s) => s !== "pronunciation")
    : ALL_SKILLS;

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {skills.map((skill, i) => {
        const sp = progress.skills[skill];
        const meta = SKILL_META[skill];
        return (
          <motion.div
            key={skill}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <span aria-hidden>{meta.icon}</span> {meta.label}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  sp.score === null ? "text-muted-2" : "text-foreground",
                )}
              >
                {skill === "pronunciation"
                  ? "—"
                  : sp.score === null
                    ? "—"
                    : `${sp.score}%`}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/10">
              {sp.score !== null && (
                <motion.div
                  className={cn("h-full rounded-full bg-gradient-to-r", meta.bar)}
                  initial={{ width: 0 }}
                  animate={{ width: `${sp.score}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 18, delay: 0.1 }}
                />
              )}
            </div>
            {!compact && sp.score === null && sp.hint && (
              <p className="mt-1 text-xs text-muted-2">
                {skill === "pronunciation"
                  ? "Pronunciation feedback is coming soon."
                  : "Keep practicing to measure this skill."}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
