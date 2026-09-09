"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award, Flame, Sparkles, Star, Target, Zap } from "lucide-react";

const ITEMS = [
  { Icon: Sparkles, top: "12%", left: "6%", color: "text-violet-400", d: 0 },
  { Icon: Flame, top: "68%", left: "4%", color: "text-orange-400", d: 1.2 },
  { Icon: Target, top: "24%", left: "92%", color: "text-blue-400", d: 0.6 },
  { Icon: Star, top: "80%", left: "88%", color: "text-amber-400", d: 1.8 },
  { Icon: Zap, top: "48%", left: "95%", color: "text-fuchsia-400", d: 2.4 },
  { Icon: Award, top: "40%", left: "3%", color: "text-emerald-400", d: 3 },
];

/** Very subtle decorative floaters behind the marketing content. */
export function FloatingElements() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {ITEMS.map(({ Icon, top, left, color, d }, i) => (
        <motion.div
          key={i}
          className={`absolute ${color} opacity-20`}
          style={{ top, left }}
          animate={{ y: [0, -22, 0], rotate: [0, 8, 0] }}
          transition={{
            duration: 9 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: d,
          }}
        >
          <Icon className="h-8 w-8 sm:h-10 sm:w-10" />
        </motion.div>
      ))}
    </div>
  );
}
