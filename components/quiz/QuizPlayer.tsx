"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useFireworks } from "@/components/fireworks/fireworks-context";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AudioButton } from "@/components/language/AudioButton";
import { getLanguage } from "@/lib/language/catalog";
import { useStore } from "@/lib/store-context";
import { quizCelebration } from "@/lib/quiz/celebrate";
import {
  QUESTION_TYPE_LABEL,
  type Quiz,
  type QuizAnswerRecord,
  type QuizQuestion,
} from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */

export function QuizPlayer({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const { quiz: quizApi } = useStore();
  const { celebrate } = useFireworks();

  // Freeze the question list for the run.
  const [questions] = useState(quiz.questions);
  const startedAtRef = useRef(new Date().toISOString());
  const startMsRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswerRecord[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [selfGraded, setSelfGraded] = useState<null | boolean>(null);

  // per-question working input
  const [choice, setChoice] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<Record<string, string>>({});

  const q = questions[idx];
  const langSpeech = useLanguageSpeech(quiz);

  const resetInputs = useCallback(() => {
    setSubmitted(false);
    setWasCorrect(false);
    setSelfGraded(null);
    setChoice(null);
    setText("");
    setMatches({});
  }, []);

  const hasSelection = useMemo(() => {
    if (!q) return false;
    if (q.type === "multiple-choice" || q.type === "true-false") return choice !== null;
    if (q.type === "matching")
      return (q.pairs ?? []).every((p) => matches[p.left]);
    return text.trim().length > 0;
  }, [q, choice, text, matches]);

  const given = useCallback((): string => {
    if (!q) return "";
    if (q.type === "multiple-choice" || q.type === "true-false") return choice ?? "";
    if (q.type === "matching") return JSON.stringify(matches);
    return text.trim();
  }, [q, choice, text, matches]);

  const submit = useCallback(() => {
    if (submitted || !hasSelection || !q) return;
    const ok = quizApi.check(q, given());
    setWasCorrect(ok);
    setSubmitted(true);
  }, [submitted, hasSelection, q, quizApi, given]);

  const finish = useCallback(
    (finalAnswers: QuizAnswerRecord[]) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const outcome = quizApi.finishAttempt({
        quizId: quiz.id,
        startedAt: startedAtRef.current,
        answers: finalAnswers,
        durationMs: Date.now() - startMsRef.current,
      });
      const c = outcome.celebration;
      if (c) celebrate(quizCelebration(c));
      else if (outcome.materialMilestone)
        celebrate({ intensity: "medium", durationMs: 1600 });
      router.replace(`/quizzes/${quiz.id}/results?attempt=${outcome.attempt.id}`);
    },
    [quizApi, quiz.id, celebrate, router],
  );

  const next = useCallback(() => {
    if (!submitted || !q) return;
    const correct =
      selfGraded === null ? wasCorrect : selfGraded || wasCorrect;
    const record: QuizAnswerRecord = {
      questionId: q.id,
      type: q.type,
      correct,
      given: displayGiven(q, given()),
    };
    const nextAnswers = [...answers, record];
    setAnswers(nextAnswers);
    if (idx + 1 >= questions.length) {
      finish(nextAnswers);
      return;
    }
    setIdx((i) => i + 1);
    resetInputs();
  }, [
    submitted,
    q,
    selfGraded,
    wasCorrect,
    given,
    answers,
    idx,
    questions.length,
    finish,
    resetInputs,
  ]);

  /* keyboard */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";
      if (e.key === "Enter") {
        e.preventDefault();
        if (submitted) next();
        else submit();
        return;
      }
      if (typing || submitted || !q) return;
      if (q.type === "multiple-choice" && q.options) {
        const n = Number(e.key);
        if (n >= 1 && n <= q.options.length) {
          e.preventDefault();
          setChoice(q.options[n - 1]);
        }
      } else if (q.type === "true-false") {
        if (e.key.toLowerCase() === "t") setChoice("True");
        if (e.key.toLowerCase() === "f") setChoice("False");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, submitted, submit, next]);

  if (!q) return null;

  const answeredCount = idx + (submitted ? 1 : 0);

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-2xl flex-col px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:pt-6">
      {/* top bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/quizzes`)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-bold">
          {quiz.source.icon} {quiz.title}
        </p>
        <span className="shrink-0 text-xs font-bold tabular-nums text-muted">
          {Math.min(idx + 1, questions.length)} / {questions.length}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar
          value={answeredCount}
          max={questions.length}
          gradient="from-primary to-secondary"
          ariaLabel="Quiz progress"
        />
      </div>

      {/* question */}
      <div className="flex flex-1 flex-col justify-center py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className={cn(
              "rounded-[2rem] border border-border bg-surface-solid p-6 shadow-soft sm:p-8",
              submitted && wasCorrect && "border-success/50",
              submitted && !wasCorrect && "border-accent/50",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-md bg-primary/12 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                {QUESTION_TYPE_LABEL[q.type]}
              </span>
              {q.topic && (
                <span className="text-[11px] font-semibold text-muted-2">
                  {q.topic}
                </span>
              )}
            </div>

            <p className="mt-3 whitespace-pre-wrap text-lg font-bold leading-snug sm:text-xl">
              {q.prompt}
            </p>

            {langSpeech && q.ref?.kind === "vocab" && (
              <div className="mt-3">
                <AudioButton
                  text={vocabTargetFromPrompt(q.prompt)}
                  lang={langSpeech}
                  size="sm"
                  label="Listen"
                  showSlow
                />
              </div>
            )}

            <div className="mt-5">
              <QuestionInput
                q={q}
                submitted={submitted}
                choice={choice}
                setChoice={setChoice}
                text={text}
                setText={setText}
                matches={matches}
                setMatches={setMatches}
                onEnterSubmit={submit}
              />
            </div>

            <AnimatePresence>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "mt-5 rounded-2xl px-4 py-3 text-sm",
                    wasCorrect || selfGraded
                      ? "bg-success/10 text-success-strong dark:text-success"
                      : "bg-accent/10 text-accent",
                  )}
                >
                  <p className="flex items-center gap-1.5 font-bold">
                    {wasCorrect || selfGraded ? (
                      <>
                        <Check className="h-4 w-4" /> Correct
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" /> Not quite
                      </>
                    )}
                  </p>
                  <RevealedAnswer q={q} />
                  {q.explanation && (
                    <p className="mt-1.5 text-foreground/80">{q.explanation}</p>
                  )}
                  {(q.type === "short-answer" || q.type === "fill-blank") &&
                    !wasCorrect &&
                    selfGraded === null && (
                      <div className="mt-3 flex items-center gap-2 border-t border-current/15 pt-2">
                        <span className="text-xs font-semibold">
                          Did you get the idea?
                        </span>
                        <button
                          onClick={() => setSelfGraded(true)}
                          className="rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-bold text-success-strong dark:text-success"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setSelfGraded(false)}
                          className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent"
                        >
                          No
                        </button>
                      </div>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* sticky controls */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-2xl">
          {submitted ? (
            <Button size="lg" className="w-full" onClick={next}>
              {idx + 1 >= questions.length ? "See results" : "Next question"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={!hasSelection}
              onClick={submit}
            >
              Submit Answer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Question inputs                                                    */
/* ------------------------------------------------------------------ */

function QuestionInput({
  q,
  submitted,
  choice,
  setChoice,
  text,
  setText,
  matches,
  setMatches,
  onEnterSubmit,
}: {
  q: QuizQuestion;
  submitted: boolean;
  choice: string | null;
  setChoice: (v: string) => void;
  text: string;
  setText: (v: string) => void;
  matches: Record<string, string>;
  setMatches: (v: Record<string, string>) => void;
  onEnterSubmit: () => void;
}) {
  if (q.type === "multiple-choice" && q.options) {
    return (
      <div className="space-y-2.5">
        {q.options.map((opt, i) => {
          const isAnswer = norm(opt) === norm(q.answer ?? "");
          const isChoice = choice === opt;
          return (
            <button
              key={opt + i}
              disabled={submitted}
              onClick={() => setChoice(opt)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition-colors disabled:cursor-default",
                !submitted && isChoice && "border-primary bg-primary/10",
                !submitted && !isChoice && "border-border-strong hover:border-primary hover:bg-primary/5",
                submitted && isAnswer && "border-success bg-success/10 text-success-strong dark:text-success",
                submitted && isChoice && !isAnswer && "border-accent bg-accent/10 text-accent",
                submitted && !isAnswer && !isChoice && "border-border opacity-60",
              )}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-foreground/8 text-[11px] font-bold text-muted-2">
                {submitted && isAnswer ? (
                  <Check className="h-3.5 w-3.5" />
                ) : submitted && isChoice ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === "true-false") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {["True", "False"].map((opt) => {
          const isAnswer = norm(opt) === norm(q.answer ?? "");
          const isChoice = choice === opt;
          return (
            <button
              key={opt}
              disabled={submitted}
              onClick={() => setChoice(opt)}
              className={cn(
                "rounded-2xl border px-4 py-5 text-base font-bold transition-colors disabled:cursor-default",
                !submitted && isChoice && "border-primary bg-primary/10",
                !submitted && !isChoice && "border-border-strong hover:border-primary hover:bg-primary/5",
                submitted && isAnswer && "border-success bg-success/10 text-success-strong dark:text-success",
                submitted && isChoice && !isAnswer && "border-accent bg-accent/10 text-accent",
                submitted && !isAnswer && !isChoice && "border-border opacity-60",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === "matching" && q.pairs) {
    const rights = shuffleStable(q.pairs.map((p) => p.right), q.id);
    return (
      <div className="space-y-2.5">
        {q.pairs.map((p) => {
          const chosen = matches[p.left];
          const correct = submitted && norm(chosen ?? "") === norm(p.right);
          return (
            <div
              key={p.left}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border p-3 sm:flex-row sm:items-center",
                submitted
                  ? correct
                    ? "border-success/50 bg-success/5"
                    : "border-accent/50 bg-accent/5"
                  : "border-border-strong",
              )}
            >
              <span className="flex-1 text-sm font-bold">{p.left}</span>
              <select
                disabled={submitted}
                value={chosen ?? ""}
                onChange={(e) =>
                  setMatches({ ...matches, [p.left]: e.target.value })
                }
                className="input sm:w-56"
                aria-label={`Match for ${p.left}`}
              >
                <option value="">Choose…</option>
                {rights.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {submitted && !correct && (
                <span className="text-xs font-semibold text-accent">
                  → {p.right}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // short-answer / fill-blank
  return (
    <div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitted}
        placeholder="Type your answer…"
        className="input text-base"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnterSubmit();
          }
        }}
      />
    </div>
  );
}

function RevealedAnswer({ q }: { q: QuizQuestion }) {
  if (q.type === "multiple-choice" || q.type === "true-false") {
    return (
      <p className="mt-1 text-foreground/80">
        Correct answer: <span className="font-bold">{q.answer}</span>
      </p>
    );
  }
  if (q.type === "short-answer" || q.type === "fill-blank") {
    return (
      <p className="mt-1 text-foreground/80">
        Accepted answer:{" "}
        <span className="font-bold">{q.acceptedAnswers?.[0]}</span>
      </p>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ */

function norm(s: string) {
  return s.trim().toLowerCase();
}

function displayGiven(q: QuizQuestion, given: string): string {
  if (q.type === "matching") {
    try {
      const map = JSON.parse(given) as Record<string, string>;
      return Object.entries(map)
        .map(([l, r]) => `${l} → ${r}`)
        .join("; ");
    } catch {
      return given;
    }
  }
  return given || "(no answer)";
}

function shuffleStable<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h = (Math.imul(1103515245, h) + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function vocabTargetFromPrompt(prompt: string): string {
  const m = prompt.match(/does\s+(.+?)\s+mean/) || prompt.match(/of\s+(.+?)[.。]/);
  return m ? m[1] : prompt;
}

function useLanguageSpeech(quiz: Quiz): string | null {
  const { snapshot } = useStore();
  if (quiz.source.type !== "language" || !quiz.source.id) return null;
  const profile = snapshot.languages.find((p) => p.id === quiz.source.id);
  if (!profile) return null;
  return getLanguage(profile.languageId)?.speechLang ?? null;
}
