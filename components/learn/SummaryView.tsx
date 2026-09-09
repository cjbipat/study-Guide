"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";

import { SourceLink } from "@/components/learn/SourceLink";
import { useStore } from "@/lib/store-context";
import type { LearningItem } from "@/lib/types";

export function SummaryView({ item }: { item: LearningItem }) {
  const { snapshot } = useStore();
  const material = snapshot.materials.find((m) => m.id === item.materialId);
  const s = item.summary;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/materials/${item.materialId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to material
      </Link>

      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl text-white shadow-glow">
          <Zap className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{item.title}</h1>
          <p className="text-xs text-muted">Quick review</p>
        </div>
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Condensed from your material&apos;s text
        <SourceLink material={material} />
      </p>

      {!s ? (
        <p className="mt-8 text-muted">This summary has no content.</p>
      ) : (
        <div className="mt-8 space-y-5">
          <motion.section
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft"
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
              Overview
            </h2>
            <p className="mt-2 leading-relaxed">{s.overview}</p>
          </motion.section>

          {s.keyPoints.length > 0 && (
            <motion.section
              initial={{ y: 12 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft"
            >
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
                Key points
              </h2>
              <ul className="mt-3 space-y-2">
                {s.keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          )}

          {s.keyTerms.length > 0 && (
            <motion.section
              initial={{ y: 12 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft"
            >
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
                Key terms
              </h2>
              <dl className="mt-3 space-y-3">
                {s.keyTerms.map((t, i) => (
                  <div key={i}>
                    <dt className="font-bold">{t.term}</dt>
                    <dd className="text-sm text-muted">{t.definition}</dd>
                  </div>
                ))}
              </dl>
            </motion.section>
          )}
        </div>
      )}
    </div>
  );
}
