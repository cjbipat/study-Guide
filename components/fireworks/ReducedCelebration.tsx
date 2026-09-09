"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Reduced-motion replacement for <Fireworks />. A single calm success pulse —
 * no particle storm, no flashing — that still marks the win.
 */
export function ReducedCelebration({
  trigger,
  onComplete,
}: {
  trigger: number;
  onComplete?: () => void;
}) {
  const [key, setKey] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setKey((k) => k + 1);
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
    >
      <AnimatePresence>
        {show && (
          <motion.div
            key={key}
            initial={{ scale: 0.4, opacity: 0.5 }}
            animate={{ scale: 2.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="h-40 w-40 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--success) 45%, transparent) 0%, transparent 70%)",
              border: "2px solid color-mix(in srgb, var(--success) 60%, transparent)",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
