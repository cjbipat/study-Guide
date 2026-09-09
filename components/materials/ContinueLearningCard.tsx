"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

import type { StudyRecommendation } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<
  StudyRecommendation["tone"],
  { grad: string; ring: string }
> = {
  primary: {
    grad: "from-violet-500 to-fuchsia-500",
    ring: "shadow-glow",
  },
  accent: {
    grad: "from-rose-500 to-orange-500",
    ring: "shadow-[0_10px_40px_-12px_rgba(244,63,94,0.5)]",
  },
  success: {
    grad: "from-emerald-500 to-teal-500",
    ring: "shadow-glow-success",
  },
};

export function ContinueLearningCard({
  recommendation,
  heading = "Continue Learning",
}: {
  recommendation: StudyRecommendation;
  heading?: string;
}) {
  const tone = TONE[recommendation.tone];
  return (
    <motion.div
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white",
        tone.grad,
        tone.ring,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
      <div className="relative">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/80">
          <Zap className="h-3.5 w-3.5" /> {heading}
        </p>
        <p className="mt-2 text-2xl font-extrabold leading-tight">
          {recommendation.label}
        </p>
        <p className="mt-1 text-sm text-white/85">{recommendation.reason}</p>
        <Link
          href={recommendation.href}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-violet-700 transition-transform hover:scale-105"
        >
          {recommendation.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}
