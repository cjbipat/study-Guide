"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Layers, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ContinueLearningCard } from "@/components/materials/ContinueLearningCard";
import { KIND_META } from "@/lib/materials/file-utils";
import { useStore } from "@/lib/store-context";
import { cn, formatRelativeTime } from "@/lib/utils";

export function YourLearning() {
  const { materials, globalLearning, globalRecommendation } = useStore();
  const g = globalLearning();
  const rec = globalRecommendation();
  const recent = materials.slice(0, 3);

  if (materials.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold">Your learning</h2>
        <div className="flex flex-col items-start gap-3 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/8 via-surface-solid to-accent/8 p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Turn your notes into a learning system</p>
            <p className="mt-1 text-sm text-muted">
              Upload a PDF, notes, or a CSV and generate flashcards, quizzes, and
              study guides from it.
            </p>
          </div>
          <Button href="/materials" size="lg" className="shrink-0">
            <Upload className="h-4 w-4" /> Upload Study Material
          </Button>
        </div>
      </section>
    );
  }

  const stats = [
    { label: "Materials", value: g.materialCount },
    { label: "Currently learning", value: g.learning + g.reviewing },
    { label: "Mastered", value: g.mastered },
    {
      label: "Total mastery",
      value: g.totalMastery === null ? "—" : `${g.totalMastery}%`,
    },
  ];

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Your learning</h2>
        <Link
          href="/materials"
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          All materials <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* stats + recent */}
        <div className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft">
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <p className="text-2xl font-extrabold tabular-nums">{s.value}</p>
                <p className="text-xs font-semibold text-muted">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 space-y-2 border-t border-border pt-4">
            {recent.map((m) => {
              const meta = KIND_META[m.kind];
              const Icon = meta.icon;
              return (
                <Link
                  key={m.id}
                  href={`/materials/${m.id}`}
                  className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-foreground/5"
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      meta.className,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {m.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {m.mastery === null
                        ? "Not studied"
                        : `${m.mastery}% mastery`}{" "}
                      · {formatRelativeTime(m.addedAt)}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* recommended for you */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted">
            <GraduationCap className="h-3.5 w-3.5" /> Recommended for you
          </p>
          {rec ? (
            <div>
              <ContinueLearningCard
                recommendation={rec.recommendation}
                heading={rec.material.name}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Study a bit more and we&apos;ll
                recommend what to do next.
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-2">
        <Layers className="h-3.5 w-3.5" />
        Recommendations come from your real study activity — nothing is faked.
      </p>
    </section>
  );
}
