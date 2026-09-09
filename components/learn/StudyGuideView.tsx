"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";

import { SourceLink } from "@/components/learn/SourceLink";
import { useStore } from "@/lib/store-context";
import type { LearningItem } from "@/lib/types";

export function StudyGuideView({ item }: { item: LearningItem }) {
  const { snapshot } = useStore();
  const material = snapshot.materials.find((m) => m.id === item.materialId);
  const sections = item.sections ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/materials/${item.materialId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to material
      </Link>

      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-2xl text-white shadow-glow">
          <BookOpen className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{item.title}</h1>
          <p className="text-xs text-muted">
            Study guide · {sections.length} section{sections.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Organised from your material&apos;s text
        <SourceLink material={material} />
      </p>

      <div className="mt-8 space-y-4">
        {sections.map((s, i) => (
          <motion.section
            key={i}
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft"
          >
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/12 text-xs font-bold text-primary">
                {i + 1}
              </span>
              {s.heading}
            </h2>
            <ul className="mt-3 space-y-2">
              {s.points.map((p, pi) => (
                <li key={pi} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-[0.95rem] leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
        {sections.length === 0 && (
          <p className="text-muted">This study guide has no sections.</p>
        )}
      </div>
    </div>
  );
}
