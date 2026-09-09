"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, FileText, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Flashcard, type CardFeedback } from "@/components/cards/Flashcard";
import { useFireworks } from "@/components/fireworks/fireworks-context";
import { AchievementModal } from "@/components/achievements/AchievementModal";
import { MaterialPreview } from "@/components/materials/MaterialPreview";
import { ResponseButtons } from "@/components/study/ResponseButtons";
import { StudyComplete } from "@/components/study/StudyComplete";
import { SuccessToast, type ToastData } from "@/components/study/SuccessToast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useStore } from "@/lib/store-context";
import { themeTokens } from "@/lib/deck-theme";
import { isExtractable } from "@/lib/materials/text-extract";
import type { FinishSessionOutcome } from "@/lib/store";
import type { AchievementId, Card, ReviewRating } from "@/lib/types";
import { celebrationCopy, isCelebration } from "@/lib/xp";
import { cn } from "@/lib/utils";

type Phase = "loading" | "question" | "answer" | "graded" | "complete" | "empty";

interface SessionTotals {
  reviewed: number;
  correct: number;
  xp: number;
}

export function StudyView({
  deckId,
  itemId,
}: {
  deckId: string;
  itemId?: string | null;
}) {
  const {
    getDeck,
    buildQueue,
    startSession,
    recordReview,
    finishStudySession,
    getLearningItem,
    getMaterial,
    getMaterialProgress,
    snapshot,
    ready,
  } = useStore();
  const { celebrate } = useFireworks();

  const deck = getDeck(deckId);

  const [phase, setPhase] = useState<Phase>("loading");
  const [queue, setQueue] = useState<Card[]>([]);
  const [pos, setPos] = useState(0);
  const [feedback, setFeedback] = useState<CardFeedback>(null);
  const [lastRating, setLastRating] = useState<ReviewRating | null>(null);
  const [totals, setTotals] = useState<SessionTotals>({
    reviewed: 0,
    correct: 0,
    xp: 0,
  });
  const [toast, setToast] = useState<ToastData | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<AchievementId[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const [finishOutcome, setFinishOutcome] = useState<FinishSessionOutcome | null>(
    null,
  );
  const [sourceOpen, setSourceOpen] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const shownAtRef = useRef<number>(Date.now());
  const initialCountRef = useRef(0);
  const primaryMaterialIdRef = useRef<string | null>(null);
  const masteryBeforeRef = useRef<number | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialise session once the store is ready.
  useEffect(() => {
    if (!ready || sessionIdRef.current) return;
    const d = getDeck(deckId);
    if (!d) {
      setPhase("empty");
      return;
    }
    const item = itemId ? getLearningItem(itemId) : undefined;
    const onlyCardIds =
      item && item.type === "flashcards" ? item.cardIds : undefined;
    const q = buildQueue(deckId, onlyCardIds ? { onlyCardIds } : undefined);
    if (q.length === 0) {
      setPhase("empty");
      return;
    }

    // Which material is this session about? An explicit item wins; otherwise the
    // material shared by most of the queued cards.
    let primaryMaterialId = item?.materialId ?? null;
    if (!primaryMaterialId) {
      const counts = new Map<string, number>();
      for (const c of q) {
        if (c.sourceMaterialId)
          counts.set(c.sourceMaterialId, (counts.get(c.sourceMaterialId) ?? 0) + 1);
      }
      let bestN = 0;
      for (const [mid, n] of counts) if (n > bestN) [primaryMaterialId, bestN] = [mid, n];
    }
    primaryMaterialIdRef.current = primaryMaterialId;
    masteryBeforeRef.current = primaryMaterialId
      ? (getMaterialProgress(primaryMaterialId)?.score ?? null)
      : null;

    const session = startSession(deckId);
    sessionIdRef.current = session.id;
    initialCountRef.current = q.length;
    setQueue(q);
    setPhase("question");
    shownAtRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const current = queue[pos];
  const theme = deck?.theme ?? "violet";
  const tk = themeTokens(theme);

  const reveal = useCallback(() => {
    if (phase !== "question") return;
    setPhase("answer");
  }, [phase]);

  const goNext = useCallback(() => {
    setFeedback(null);
    setLastRating(null);
    setBusy(false);
    const next = pos + 1;
    if (next >= queue.length) {
      if (sessionIdRef.current) {
        const outcome = finishStudySession({
          sessionId: sessionIdRef.current,
          materialId: primaryMaterialIdRef.current,
          masteryBefore: masteryBeforeRef.current,
        });
        setFinishOutcome(outcome);
      }
      setPhase("complete");
      return;
    }
    setPos(next);
    setPhase("question");
    shownAtRef.current = Date.now();
  }, [pos, queue.length, finishStudySession]);

  // "Again": requeue the current card a few positions later, keep pos where it
  // is (the next card has shifted into this slot) and reset to the question.
  const continueAfterAgain = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setQueue((q) => {
      const copyQ = [...q];
      const [c] = copyQ.splice(pos, 1);
      if (c) {
        const insertAt = Math.min(copyQ.length, pos + 3);
        copyQ.splice(insertAt, 0, c);
      }
      return copyQ;
    });
    setFeedback(null);
    setLastRating(null);
    setBusy(false);
    setPhase("question");
    shownAtRef.current = Date.now();
  }, [pos]);

  const showToast = useCallback((data: Omit<ToastData, "id">) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ ...data, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const grade = useCallback(
    (rating: ReviewRating) => {
      if (phase !== "answer" || busy || !current || !sessionIdRef.current) return;
      setBusy(true);
      setLastRating(rating);

      const responseMs = Date.now() - shownAtRef.current;
      const outcome = recordReview({
        sessionId: sessionIdRef.current,
        deckId,
        cardId: current.id,
        rating,
        responseMs,
      });

      setTotals((t) => ({
        reviewed: t.reviewed + 1,
        correct: t.correct + (outcome.correct ? 1 : 0),
        xp: t.xp + outcome.xpEarned,
      }));

      if (outcome.newAchievements.length) {
        setAchievementQueue((q) => [...q, ...outcome.newAchievements]);
      }

      const copy = celebrationCopy(rating);

      if (rating === "again") {
        // Gentle: shake, keep the answer up, let the user continue when ready.
        setFeedback("incorrect");
        setPhase("graded");
        return;
      }

      if (isCelebration(rating)) {
        setFeedback("correct");
        setPhase("graded");
        celebrate({
          intensity: rating === "easy" ? "high" : "medium",
          durationMs: rating === "easy" ? 1900 : 1500,
          originYRatio: 0.44,
        });
        showToast({
          title: copy.title,
          xp: outcome.xpEarned,
          streak: outcome.streak,
        });
      } else {
        // "hard" — quiet acknowledgement
        setFeedback("correct");
        setPhase("graded");
        showToast({ title: copy.title, xp: outcome.xpEarned });
      }

      // Hold the auto-advance while an achievement modal is on screen; it
      // resumes when the queue clears.
      if (outcome.newAchievements.length) {
        setPendingAdvance(true);
      } else {
        advanceTimer.current = setTimeout(
          goNext,
          rating === "easy" ? 1500 : 1250,
        );
      }
    },
    [
      phase,
      busy,
      current,
      deckId,
      recordReview,
      celebrate,
      showToast,
      goNext,
    ],
  );

  // Resume a held advance once every achievement has been acknowledged.
  useEffect(() => {
    if (pendingAdvance && achievementQueue.length === 0) {
      setPendingAdvance(false);
      if (lastRating === "again") return;
      advanceTimer.current = setTimeout(goNext, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAdvance, achievementQueue.length]);

  // Keyboard shortcuts
  useEffect(() => {
    if (phase === "complete" || phase === "empty" || phase === "loading") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (achievementQueue.length || sourceOpen) return;

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (phase === "question") reveal();
        else if (phase === "graded" && lastRating === "again") continueAfterAgain();
        return;
      }
      if (phase === "answer") {
        const map: Record<string, ReviewRating> = {
          "1": "again",
          "2": "hard",
          "3": "good",
          "4": "easy",
        };
        if (map[e.key]) {
          e.preventDefault();
          grade(map[e.key]);
        }
      }
      if (phase === "graded" && lastRating === "again" && e.key === "Enter") {
        continueAfterAgain();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    phase,
    reveal,
    grade,
    lastRating,
    continueAfterAgain,
    achievementQueue.length,
    sourceOpen,
  ]);

  const progressValue = totals.reviewed;
  const progressMax = Math.max(initialCountRef.current, queue.length);

  /* ------------------------------------------------------------------ */

  if (phase === "loading") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        Preparing your session…
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 text-center">
        <div>
          <div className="text-5xl">
            {deck ? "✅" : "🤔"}
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">
            {deck ? "You're all caught up" : "Deck not found"}
          </h1>
          <p className="mt-2 text-muted">
            {deck
              ? "Nothing is due in this deck right now. Add more cards or come back later."
              : "This deck may have been removed."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {deck && (
              <Button href={`/decks/${deckId}/cards/new`} variant="outline">
                Add cards
              </Button>
            )}
            <Button href="/decks">Back to Decks</Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    const materialId =
      finishOutcome?.materialId ?? primaryMaterialIdRef.current;
    const material = materialId ? getMaterial(materialId) : undefined;
    return (
      <>
        <StudyComplete
          deckId={deckId}
          deckName={deck?.name ?? "Deck"}
          totals={totals}
          materialId={materialId}
          materialName={material?.name ?? null}
          masteryBefore={finishOutcome?.masteryBefore ?? null}
          masteryAfter={finishOutcome?.masteryAfter ?? null}
          milestone={finishOutcome?.milestone ?? null}
          hadAchievement={achievementQueue.length > 0}
        />
        <AchievementModal
          queue={achievementQueue}
          onDismiss={() => setAchievementQueue((q) => q.slice(1))}
        />
      </>
    );
  }

  const sourceMaterial = current?.sourceMaterialId
    ? getMaterial(current.sourceMaterialId)
    : undefined;
  const rawSourceMaterial = current?.sourceMaterialId
    ? snapshot.materials.find((m) => m.id === current.sourceMaterialId)
    : undefined;

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-2xl flex-col px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/decks/${deckId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Decks</span>
          <span className="sm:hidden">Exit</span>
        </Link>
        <div className="flex-1 text-center">
          <p className="truncate text-sm font-bold">{deck?.name}</p>
        </div>
        <Link
          href={`/decks/${deckId}`}
          aria-label="End session"
          className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar
          value={progressValue}
          max={progressMax}
          gradient={tk.bar}
          ariaLabel="Session progress"
        />
        <span className="shrink-0 text-xs font-bold text-muted tabular-nums">
          {Math.min(
            totals.reviewed + (phase === "graded" ? 0 : 1),
            progressMax,
          )}{" "}
          / {progressMax}
        </span>
      </div>

      {/* Card */}
      <div className="flex flex-1 flex-col justify-center py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.id + "-" + pos}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            {current && (
              <Flashcard
                theme={theme}
                question={current.question}
                answer={current.answer}
                revealed={phase !== "question"}
                feedback={feedback}
                tags={current.tags}
                onClick={phase === "question" ? reveal : undefined}
                minHeight="min-h-[240px] sm:min-h-[300px]"
                footer={
                  current.imageUrl ? (
                    <img
                      src={current.imageUrl}
                      alt=""
                      className="max-h-44 w-full rounded-2xl border border-border object-contain"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : null
                }
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* source indicator */}
        {sourceMaterial && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
            <FileText className="h-3.5 w-3.5" />
            <span>From</span>
            <span className="max-w-[180px] truncate font-semibold text-foreground">
              {sourceMaterial.name}
            </span>
            <span aria-hidden>·</span>
            {isExtractable(sourceMaterial.kind) ? (
              <button
                onClick={() => setSourceOpen(true)}
                className="font-semibold text-primary hover:underline"
              >
                View source
              </button>
            ) : (
              <Link
                href={`/materials/${sourceMaterial.id}`}
                className="font-semibold text-primary hover:underline"
              >
                View source
              </Link>
            )}
          </div>
        )}

        {/* incorrect helper */}
        <AnimatePresence>
          {phase === "graded" && lastRating === "again" && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-center text-sm font-semibold text-accent"
            >
              Not quite — take another look. You&apos;ll see this card again soon.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <Modal
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        labelledBy="source-title"
        className="max-w-3xl"
      >
        <h3 id="source-title" className="pr-8 text-lg font-extrabold">
          {sourceMaterial?.name}
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          The material this card was created from
        </p>
        {rawSourceMaterial && (
          <div className="mt-4">
            <MaterialPreview material={rawSourceMaterial} />
          </div>
        )}
        <div className="mt-4 flex gap-3">
          {sourceMaterial && (
            <Button href={`/materials/${sourceMaterial.id}`} variant="outline">
              Open material
            </Button>
          )}
          <Button variant="ghost" onClick={() => setSourceOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Controls */}
      <div className="pb-2">
        {phase === "question" && (
          <Button onClick={reveal} size="lg" className="w-full">
            Show Answer
            <kbd className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              Space
            </kbd>
          </Button>
        )}

        {phase === "answer" && current && (
          <ResponseButtons card={current} disabled={busy} onRate={grade} />
        )}

        {phase === "graded" && lastRating === "again" && (
          <Button onClick={continueAfterAgain} size="lg" className="w-full">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {phase === "graded" && lastRating !== "again" && (
          <div
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-bold",
              "border-success/40 bg-success/10 text-success-strong dark:text-success",
            )}
          >
            {celebrationCopy(lastRating ?? "good").title} · advancing…
          </div>
        )}
      </div>

      <SuccessToast toast={toast} />

      <AchievementModal
        queue={achievementQueue}
        onDismiss={() => setAchievementQueue((q) => q.slice(1))}
      />
    </div>
  );
}
