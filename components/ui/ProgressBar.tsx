"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  gradient = "from-primary to-secondary",
  height = "h-2.5",
  ariaLabel,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  gradient?: string;
  height?: string;
  ariaLabel?: string;
}) {
  const pctVal = clamp((value / (max || 1)) * 100, 0, 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pctVal)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn(
        "w-full overflow-hidden rounded-full bg-foreground/10",
        height,
        className,
      )}
    >
      <motion.div
        className={cn(
          "h-full rounded-full bg-gradient-to-r",
          gradient,
          barClassName,
        )}
        initial={{ width: 0 }}
        animate={{ width: `${pctVal}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}
