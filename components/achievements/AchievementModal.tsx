"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";

import { useFireworks } from "@/components/fireworks/fireworks-context";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ACHIEVEMENT_MAP } from "@/lib/achievements";
import type { AchievementId } from "@/lib/types";

export function AchievementModal({
  queue,
  onDismiss,
}: {
  queue: AchievementId[];
  onDismiss: () => void;
}) {
  const { celebrate } = useFireworks();
  const current = queue[0];
  const def = current ? ACHIEVEMENT_MAP[current] : null;

  useEffect(() => {
    if (def?.major) {
      celebrate({ intensity: "high", durationMs: 2000, originYRatio: 0.4 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!def) return null;

  return (
    <Modal open={!!def} onClose={onDismiss} labelledBy="ach-title" showClose={false}>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-5xl shadow-glow"
        >
          {def.icon}
        </motion.div>
        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-primary">
          Achievement unlocked
        </p>
        <h2 id="ach-title" className="mt-1 text-2xl font-extrabold">
          {def.title}
        </h2>
        <p className="mt-2 text-muted">{def.description}</p>

        <Button onClick={onDismiss} className="mt-7 w-full">
          {queue.length > 1 ? `Next (${queue.length - 1} more)` : "Keep going"}
        </Button>
      </div>
    </Modal>
  );
}
