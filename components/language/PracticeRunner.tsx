"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useFireworks } from "@/components/fireworks/fireworks-context";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { VocabRecallCard } from "@/components/language/exercises/VocabRecallCard";
import { VocabChoiceCard } from "@/components/language/exercises/VocabChoiceCard";
import { LearnCard } from "@/components/language/exercises/LearnCard";
import { ListeningTypeCard } from "@/components/language/exercises/ListeningTypeCard";
import { ShadowingCard } from "@/components/language/exercises/ShadowingCard";
import { SpeakingCard } from "@/components/language/exercises/SpeakingCard";
import { WritingCard } from "@/components/language/exercises/WritingCard";
import { CharacterCard } from "@/components/language/exercises/CharacterCard";
import { ToneCard } from "@/components/language/exercises/ToneCard";
import { ReadingCard } from "@/components/language/exercises/ReadingCard";
import { useStore } from "@/lib/store-context";
import { getLanguage } from "@/lib/language/catalog";
import { milestoneCelebration, type LangMilestone } from "@/lib/language/progress";
import type { Exercise } from "@/lib/language/exercises";
import type { ReviewGrade } from "@/lib/language/scheduler";
import type { PracticeMode } from "@/lib/language/types";
import { cn, pct } from "@/lib/utils";

export interface RunnerConfig {
  profileId: string;
  exercises: Exercise[];
  title: string;
  /** true = full daily session (writes a LanguageSession + streak) */
  session?: boolean;
  sessionBlocks?: PracticeMode[];
  /** where "Continue" goes when done */
  doneHref: string;
}

type Phase = "loading" | "running" | "advancing" | "done";

export function PracticeRunner({ config }: { config: RunnerConfig }) {
  const router = useRouter();
  const { lang } = useStore();
  const { celebrate } = useFireworks();
  const profile = lang.getProfile(config.profileId)?.profile;
  const language = profile ? getLanguage(profile.languageId) : undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [xp, setXp] = useState(0);
  const [feedback, setFeedback] = useState<null | boolean>(null);
  const [milestone, setMilestone] = useState<LangMilestone | null>(null);
  const [masteryDelta, setMasteryDelta] = useState<{ before: number | null; after: number | null } | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef(Date.now());
  const masteryBeforeRef = useRef<number | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Freeze the exercise queue for the lifetime of the runner — the parent
  // rebuilds it on every store commit, but a session's questions must be stable.
  const [exercises] = useState(config.exercises);
  const current = exercises[pos];

  useEffect(() => {
    if (!profile) return;
    if (config.session && !sessionIdRef.current) {
      const s = lang.startSession(config.profileId, config.sessionBlocks ?? []);
      sessionIdRef.current = s.id;
      startedAtRef.current = Date.now();
      masteryBeforeRef.current =
        lang.progress(config.profileId)?.skills.vocabulary.score ?? null;
    }
    if (exercises.length === 0) setPhase("done");
    else setPhase("running");
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile != null]);

  const finish = useCallback(() => {
    if (config.session && sessionIdRef.current) {
      const outcome = lang.finishSession({
        sessionId: sessionIdRef.current,
        profileId: config.profileId,
        vocabMasteryBefore: masteryBeforeRef.current,
        startedAtMs: startedAtRef.current,
      });
      setMilestone(outcome.milestone);
      setMasteryDelta({
        before: outcome.vocabMasteryBefore,
        after: outcome.vocabMasteryAfter,
      });
      if (outcome.milestone) {
        celebrate(milestoneCelebration(outcome.milestone));
      } else if (
        outcome.summary.accuracy >= 80 &&
        outcome.summary.reviewed >= 5
      ) {
        celebrate({ intensity: "medium", durationMs: 1500 });
      }
    } else {
      const acc = pct(correct, exercises.length);
      if (acc >= 90 && exercises.length >= 5) {
        celebrate({ intensity: "medium", durationMs: 1400 });
      }
    }
    setPhase("done");
  }, [config, correct, exercises.length, lang, celebrate]);

  const next = useCallback(() => {
    setFeedback(null);
    if (pos + 1 >= exercises.length) {
      finish();
      return;
    }
    setPos((p) => p + 1);
    setPhase("running");
  }, [pos, exercises.length, finish]);

  const record = useCallback(
    (
      isCorrect: boolean,
      ms: number,
      opts?: { silent?: boolean; grade?: ReviewGrade },
    ) => {
      if (!current) return;
      const skill = current.skill;
      const vocabId =
        "item" in current && current.item ? current.item.id : null;
      const mode = modeForExercise(current);
      const outcome = lang.recordReview({
        profileId: config.profileId,
        vocabId,
        skill,
        mode,
        correct: isCorrect,
        responseMs: ms,
        grade: opts?.grade,
      });
      setXp((x) => x + outcome.xpEarned);
      if (outcome.correct) setCorrect((c) => c + 1);
      if (!opts?.silent) {
        setFeedback(outcome.correct);
        setPhase("advancing");
        advanceRef.current = setTimeout(next, outcome.correct ? 900 : 1600);
      }
    },
    [current, lang, config.profileId, next],
  );

  const recordGraded = useCallback(
    (grade: ReviewGrade, ms: number) => {
      record(grade !== "again", ms, { grade });
    },
    [record],
  );

  if (!profile || !language) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        Language not found.
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        Preparing your practice…
      </div>
    );
  }

  if (phase === "done") {
    const accuracy = pct(correct, Math.max(exercises.length, 1));
    return (
      <DoneScreen
        title={config.title}
        accuracy={accuracy}
        correct={correct}
        total={exercises.length}
        xp={xp}
        milestone={milestone}
        masteryDelta={masteryDelta}
        streak={config.session ? (lang.getProfile(config.profileId)?.profile.streak ?? 0) : null}
        doneHref={config.doneHref}
        onAgain={() => router.refresh()}
      />
    );
  }

  const romMode = profile.romanizationMode;

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-2xl flex-col px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-8">
      {/* top bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={config.doneHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Exit</span>
        </Link>
        <p className="flex-1 truncate text-center text-sm font-bold">
          {language.flag} {config.title}
        </p>
        <Link
          href={config.doneHref}
          aria-label="Exit"
          className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-foreground/5"
        >
          <X className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar
          value={pos + (phase === "advancing" ? 1 : 0)}
          max={exercises.length}
          gradient="from-primary to-secondary"
          ariaLabel="Practice progress"
        />
        <span className="shrink-0 text-xs font-bold tabular-nums text-muted">
          {Math.min(pos + 1, exercises.length)} / {exercises.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center py-4 sm:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={pos}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className={cn(
              "flex min-h-[26rem] flex-col justify-center rounded-[2rem] border border-border bg-surface-solid p-6 shadow-soft sm:min-h-[30rem] sm:p-8",
              feedback === true && "border-success/50",
              feedback === false && "border-accent/50",
            )}
          >
            <ExerciseView
              exercise={current}
              speechLang={language.speechLang}
              romanizationMode={romMode}
              onAnswer={record}
              onGraded={recordGraded}
              onDone={(known?: boolean) => {
                // non-graded exercises (learn intro skip, shadowing, speaking)
                record(known !== false, 4000, { silent: true });
                next();
              }}
              onRecorded={(ms, id, isLine) => {
                lang.recordPronunciationAttempt({
                  profileId: config.profileId,
                  vocabId: isLine ? null : id,
                  lineId: isLine ? id : null,
                  durationMs: ms,
                });
              }}
              onAddVocab={(w) => lang.addVocabFromWord(config.profileId, w)}
            />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {feedback !== null && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "mt-4 text-center text-sm font-bold",
                feedback ? "text-success-strong dark:text-success" : "text-accent",
              )}
            >
              {feedback ? "Correct!" : "Not quite — keep going."}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

function modeForExercise(e: Exercise): PracticeMode {
  switch (e.kind) {
    case "learn":
      return "learn";
    case "vocab":
      return e.skill === "listening" ? "listening" : "review";
    case "listening-type":
      return "listening";
    case "shadowing":
      return "shadowing";
    case "speaking":
      return "speaking";
    case "reading":
      return "reading";
    case "writing-translate":
    case "writing-order":
      return "writing";
    case "character":
      return "characters";
    case "tone":
      return "tones";
  }
}

function ExerciseView({
  exercise,
  speechLang,
  romanizationMode,
  onAnswer,
  onGraded,
  onDone,
  onRecorded,
  onAddVocab,
}: {
  exercise: Exercise;
  speechLang: string;
  romanizationMode: import("@/lib/language/types").RomanizationMode;
  onAnswer: (correct: boolean, ms: number) => void;
  onGraded: (grade: ReviewGrade, ms: number) => void;
  onDone: (known?: boolean) => void;
  onRecorded: (ms: number, id: string, isLine: boolean) => void;
  onAddVocab: (w: { target: string; translation: string; pronunciation: string }) => void;
}) {
  switch (exercise.kind) {
    case "learn":
      return (
        <LearnCard
          exercise={exercise}
          speechLang={speechLang}
          romanizationMode={romanizationMode}
          onGraded={onGraded}
        />
      );
    case "vocab":
      return exercise.exercise.format === "reveal" ? (
        <VocabRecallCard
          exercise={exercise.exercise}
          speechLang={speechLang}
          romanizationMode={romanizationMode}
          onGraded={onGraded}
        />
      ) : (
        <VocabChoiceCard
          exercise={exercise.exercise}
          speechLang={speechLang}
          romanizationMode={romanizationMode}
          onAnswer={onAnswer}
        />
      );
    case "listening-type":
      return (
        <ListeningTypeCard
          exercise={exercise}
          speechLang={speechLang}
          romanizationMode={romanizationMode}
          onAnswer={onAnswer}
        />
      );
    case "shadowing":
      return (
        <ShadowingCard
          exercise={exercise}
          speechLang={speechLang}
          romanizationMode={romanizationMode}
          onRecorded={(ms, id) => onRecorded(ms, id, true)}
          onDone={() => onDone()}
        />
      );
    case "speaking":
      return (
        <SpeakingCard
          exercise={exercise}
          speechLang={speechLang}
          romanizationMode={romanizationMode}
          onRecorded={(ms, id) => onRecorded(ms, id, false)}
          onDone={() => onDone()}
        />
      );
    case "writing-translate":
    case "writing-order":
      return (
        <WritingCard
          exercise={exercise}
          romanizationMode={romanizationMode}
          onAnswer={onAnswer}
        />
      );
    case "character":
      return (
        <CharacterCard
          exercise={exercise}
          speechLang={speechLang}
          onDone={(known) => onDone(known)}
        />
      );
    case "tone":
      return (
        <ToneCard exercise={exercise} speechLang={speechLang} onAnswer={onAnswer} />
      );
    case "reading":
      return (
        <ReadingCard
          exercise={exercise}
          speechLang={speechLang}
          romanizationMode={romanizationMode}
          onAddVocab={onAddVocab}
          onAnswer={onAnswer}
        />
      );
  }
}

function DoneScreen({
  title,
  accuracy,
  correct,
  total,
  xp,
  milestone,
  masteryDelta,
  streak,
  doneHref,
  onAgain,
}: {
  title: string;
  accuracy: number;
  correct: number;
  total: number;
  xp: number;
  milestone: LangMilestone | null;
  masteryDelta: { before: number | null; after: number | null } | null;
  streak: number | null;
  doneHref: string;
  onAgain: () => void;
}) {
  const heading = milestone
    ? milestone.kind === "vocab-mastery"
      ? `${milestone.value}% vocabulary mastery!`
      : milestone.kind === "streak"
        ? `${milestone.value}-day streak!`
        : milestone.kind === "perfect-challenge"
          ? "Perfect challenge!"
          : "Level complete!"
    : accuracy >= 80
      ? "Great work!"
      : "Session complete";
  const gained =
    masteryDelta &&
    masteryDelta.after !== null &&
    masteryDelta.before !== null &&
    masteryDelta.after > masteryDelta.before;

  return (
    <div className="mx-auto grid min-h-[100svh] max-w-lg place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full rounded-[2rem] border border-border bg-surface-solid p-8 text-center shadow-soft"
      >
        <div className="text-5xl">{milestone ? "🎆" : accuracy >= 80 ? "🎉" : "💪"}</div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{heading}</h1>
        <p className="mt-2 text-muted">{title}</p>

        <div className="mt-7 flex items-center justify-center gap-8">
          <ProgressRing value={accuracy} size={104} stroke={10} colorClass="text-primary">
            <div>
              <div className="text-2xl font-extrabold">{accuracy}%</div>
              <div className="text-[11px] font-semibold text-muted">accuracy</div>
            </div>
          </ProgressRing>
          <div className="text-left">
            <div className="flex items-center gap-2 text-2xl font-extrabold text-accent">
              <Sparkles className="h-5 w-5" /> +{xp}
            </div>
            <p className="text-sm text-muted">XP earned</p>
            <div className="mt-3 text-2xl font-extrabold text-success-strong dark:text-success">
              {correct}/{total}
            </div>
            <p className="text-sm text-muted">correct</p>
          </div>
        </div>

        {masteryDelta && masteryDelta.after !== null && (
          <div className="mt-6 rounded-2xl border border-border bg-surface-2 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">
              Vocabulary
            </p>
            <p className="mt-1 text-sm font-bold">
              {gained ? (
                <>
                  {masteryDelta.before}% →{" "}
                  <span className="text-success-strong dark:text-success">
                    {masteryDelta.after}%
                  </span>
                </>
              ) : (
                <>Holding at {masteryDelta.after}%</>
              )}
            </p>
          </div>
        )}

        {streak !== null && (
          <p className="mt-4 text-sm font-semibold text-accent">
            🔥 {streak} day streak
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href={doneHref} size="lg" className="flex-1">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="flex-1" onClick={onAgain}>
            Practise more
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
