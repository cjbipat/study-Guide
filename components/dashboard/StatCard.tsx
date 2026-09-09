"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  decimals = 0,
  accent = "text-primary",
  tint = "bg-primary/10",
  hint,
  index = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  accent?: string;
  tint?: string;
  hint?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ y: 14 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="rounded-3xl border border-border bg-surface-solid p-5 shadow-soft"
    >
      <div className={cn("grid h-10 w-10 place-items-center rounded-xl", tint, accent)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-3xl font-extrabold tracking-tight">
        <AnimatedCounter value={value} suffix={suffix} decimals={decimals} durationMs={900} />
      </div>
      <p className="mt-1 text-sm font-semibold text-muted">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-2">{hint}</p>}
    </motion.div>
  );
}
