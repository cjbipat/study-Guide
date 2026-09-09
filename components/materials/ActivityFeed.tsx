"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  FileUp,
  HelpCircle,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

import type { LearningActivity, LearningActivityType } from "@/lib/types";
import { cn } from "@/lib/utils";

const META: Record<
  LearningActivityType,
  { icon: typeof Layers; className: string; verb: string }
> = {
  "material-added": { icon: FileUp, className: "bg-foreground/8 text-muted", verb: "Uploaded material" },
  "flashcards-created": { icon: Layers, className: "bg-violet-500/12 text-violet-500", verb: "Created flashcards" },
  "quiz-created": { icon: HelpCircle, className: "bg-blue-500/12 text-blue-500", verb: "Created a practice quiz" },
  "guide-created": { icon: BookOpen, className: "bg-emerald-500/12 text-emerald-500", verb: "Created a study guide" },
  "summary-created": { icon: Zap, className: "bg-amber-500/12 text-amber-500", verb: "Created a quick review" },
  "flashcard-session": { icon: CheckCircle2, className: "bg-primary/12 text-primary", verb: "Studied flashcards" },
  "quiz-attempt": { icon: HelpCircle, className: "bg-blue-500/12 text-blue-500", verb: "Completed a practice quiz" },
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export function ActivityFeed({
  activities,
  emptyHint = "No activity yet. Your study sessions and quiz attempts will show up here.",
  limit = 10,
}: {
  activities: LearningActivity[];
  emptyHint?: string;
  limit?: number;
}) {
  const shown = activities.slice(0, limit);

  if (shown.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-8 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-muted-2" />
        <p className="mt-2 text-sm text-muted">{emptyHint}</p>
      </div>
    );
  }

  const groups: { label: string; items: LearningActivity[] }[] = [];
  for (const a of shown) {
    const label = dayLabel(a.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(a);
    else groups.push({ label, items: [a] });
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-2">
            {g.label}
          </p>
          <ul className="space-y-2">
            {g.items.map((a, i) => {
              const m = META[a.type];
              return (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.2) }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface-solid p-3"
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                      m.className,
                    )}
                  >
                    <m.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{m.verb}</p>
                    <p className="truncate text-xs text-muted">
                      {a.type === "flashcard-session" && a.reviewed != null
                        ? `${a.reviewed} cards · ${a.accuracy}% accuracy · +${a.xpEarned} XP`
                        : a.type === "quiz-attempt" && a.accuracy != null
                          ? `${a.accuracy}% score · ${a.correct}/${a.reviewed} correct`
                          : (a.detail ?? "")}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-2">
                    {new Date(a.at).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </motion.li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
