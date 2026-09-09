"use client";

import { useState } from "react";

import type { RomanizationMode } from "@/lib/language/types";
import { cn } from "@/lib/utils";

/**
 * Renders a romanisation line (pinyin / romaji / romaja) honouring the learner's
 * chosen visibility — so advanced learners don't stay dependent on it.
 */
export function Romanization({
  text,
  mode,
  className,
  size = "md",
}: {
  text: string;
  mode: RomanizationMode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [revealed, setRevealed] = useState(false);
  if (!text) return null;

  const sizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg",
  }[size];

  if (mode === "hidden") return null;

  if (mode === "tap" && !revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className={cn(
          "rounded-md border border-dashed border-border px-2 py-0.5 font-medium text-muted-2 transition-colors hover:text-muted",
          sizes,
          className,
        )}
      >
        Tap for pronunciation
      </button>
    );
  }

  return (
    <span className={cn("font-medium text-muted", sizes, className)}>{text}</span>
  );
}
