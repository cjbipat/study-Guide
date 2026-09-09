"use client";

import { motion } from "framer-motion";
import { ArrowRight, RotateCcw, Sparkles, TrendingUp } from "lucide-react";
import { useEffect } from "react";

import { useFireworks } from "@/components/fireworks/fireworks-context";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useStore } from "@/lib/store-context";
import { milestoneCelebration, type Milestone } from "@/lib/materials/progress";
import { pct } from "@/lib/utils";

export function StudyComplete({
  deckId,
  deckName,
  totals,
  materialId,
  materialName,
  masteryBefore,
  masteryAfter,
  milestone,
  hadAchievement,
}: {
  deckId: string;
  deckName: string;
  totals: { reviewed: number; correct: number; xp: number };
  materialId?: string | null;
  materialName?: string | null;
  masteryBefore?: number | null;
  masteryAfter?: number | null;
  milestone?: Milestone | null;
  hadAchievement?: boolean;
}) {
  const { celebrate } = useFireworks();
  const { recommendationForMaterial } = useStore();
  const recommendation = materialId
    ? recommendationForMaterial(materialId)
    : null;

  const accuracy = pct(totals.correct, totals.reviewed);
  const excellent = totals.reviewed >= 3 && accuracy >= 80;
  const perfect = totals.reviewed >= 5 && accuracy === 100;

  const showMastery =
    masteryAfter !== null &&
    masteryAfter !== undefined &&
    masteryBefore !== null &&
    masteryBefore !== undefined;
  const gained =
    showMastery && (masteryAfter as number) > (masteryBefore as number);

  useEffect(() => {
    // Fireworks only for: excellent accuracy, a mastery milestone, or an
    // achievement unlock. Intensity scales with the milestone.
    if (milestone) {
      celebrate(milestoneCelebration(milestone));
      return;
    }
    if (excellent || hadAchievement) {
      celebrate({
        intensity: perfect ? "high" : "medium",
        durationMs: perfect ? 2200 : 1500,
        originYRatio: 0.5,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto grid min-h-[100svh] max-w-lg place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="w-full rounded-[2rem] border border-border bg-surface-solid p-8 text-center shadow-soft"
      >
        <div className="text-5xl">
          {milestone === 100 ? "🏆" : perfect ? "🏆" : excellent ? "🎆" : "🎉"}
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
          {milestone === 100
            ? "Material mastered!"
            : milestone
              ? `${milestone}% mastery reached`
              : excellent
                ? "Great session!"
                : "Session complete"}
        </h1>
        <p className="mt-2 text-muted">
          {materialName ? materialName : deckName} · {totals.reviewed} card
          {totals.reviewed === 1 ? "" : "s"} reviewed
        </p>

        <div className="mt-8 flex items-center justify-center gap-8">
          <ProgressRing
            value={accuracy}
            size={104}
            stroke={10}
            colorClass="text-success"
          >
            <div>
              <div className="text-2xl font-extrabold">{accuracy}%</div>
              <div className="text-[11px] font-semibold text-muted">accuracy</div>
            </div>
          </ProgressRing>
          <div className="text-left">
            <div className="flex items-center gap-2 text-2xl font-extrabold text-accent">
              <Sparkles className="h-5 w-5" /> +{totals.xp}
            </div>
            <p className="text-sm text-muted">XP earned</p>
            <div className="mt-3 text-2xl font-extrabold text-success-strong dark:text-success">
              {totals.correct}/{totals.reviewed}
            </div>
            <p className="text-sm text-muted">correct</p>
          </div>
        </div>

        {showMastery && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-7 rounded-2xl border border-border bg-surface-2 p-4 text-left"
          >
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted">
              <TrendingUp className="h-3.5 w-3.5" /> Your progress
            </p>
            <p className="mt-1.5 text-sm font-bold">
              {gained ? (
                <>
                  Mastery increased{" "}
                  <span className="text-muted">{masteryBefore}%</span> →{" "}
                  <span className="text-success-strong dark:text-success">
                    {masteryAfter}%
                  </span>
                </>
              ) : (
                <>
                  Mastery holding steady at{" "}
                  <span className="text-foreground">{masteryAfter}%</span>
                </>
              )}
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-success"
                initial={{ width: `${masteryBefore}%` }}
                animate={{ width: `${masteryAfter}%` }}
                transition={{ delay: 0.5, type: "spring", stiffness: 90, damping: 18 }}
              />
            </div>
          </motion.div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            href={recommendation ? recommendation.href : `/study/${deckId}`}
            size="lg"
            className="flex-1"
          >
            {recommendation ? (
              <>
                Continue Learning <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" /> Study again
              </>
            )}
          </Button>
          {materialId ? (
            <Button
              href={`/materials/${materialId}`}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              Back to Material
            </Button>
          ) : (
            <Button
              href="/dashboard"
              variant="outline"
              size="lg"
              className="flex-1"
            >
              Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button href={`/decks/${deckId}`} variant="ghost" size="sm" className="mt-3">
          Back to {deckName}
        </Button>
      </motion.div>
    </div>
  );
}
