"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ListChecks,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { QuizResultView } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function QuizResults({ view }: { view: QuizResultView }) {
  const router = useRouter();
  const { attempt, quiz, topics, missed, improvement, isPersonalBest } = view;
  const great = attempt.score >= 80;
  const perfect = attempt.score === 100;

  const sourceActions = buildSourceActions(quiz, missed.length > 0);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="rounded-[2rem] border border-border bg-surface-solid p-6 text-center shadow-soft sm:p-8"
      >
        <div className="text-5xl">{perfect ? "🏆" : great ? "🎉" : "💪"}</div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          {perfect ? "Perfect score!" : "Quiz complete!"}
        </h1>
        <p className="mt-1 text-muted">{quiz.title}</p>

        <div className="mt-6 flex items-center justify-center gap-7">
          <ProgressRing value={attempt.score} size={110} stroke={11} colorClass="text-primary">
            <div>
              <div className="text-2xl font-extrabold">{attempt.score}%</div>
              <div className="text-[11px] font-semibold text-muted">score</div>
            </div>
          </ProgressRing>
          <div className="space-y-2 text-left">
            <Metric label="Correct" value={`${attempt.correct} / ${attempt.total}`} good />
            <Metric label="Incorrect" value={String(attempt.total - attempt.correct)} />
            <Metric label="Time" value={fmtDuration(attempt.durationMs)} />
          </div>
        </div>

        {(improvement !== null || isPersonalBest) && (
          <p
            className={cn(
              "mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
              (improvement ?? 0) > 0 || isPersonalBest
                ? "bg-success/12 text-success-strong dark:text-success"
                : "bg-foreground/6 text-muted",
            )}
          >
            <Sparkles className="h-4 w-4" />
            {isPersonalBest
              ? "New personal best"
              : improvement !== null && improvement > 0
                ? `Up ${improvement} points from your best`
                : improvement !== null && improvement < 0
                  ? `${Math.abs(improvement)} below your best`
                  : "Matched your best"}
          </p>
        )}

        {/* performance */}
        <div className="mt-6 rounded-2xl border border-border bg-surface-2 p-4 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            {topics.length ? "Performance by topic" : "Questions to review"}
          </p>
          {topics.length ? (
            <ul className="mt-2 space-y-2">
              {topics.map((t) => {
                const pct = Math.round((t.correct / t.total) * 100);
                return (
                  <li key={t.topic}>
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{t.topic}</span>
                      <span
                        className={cn(
                          pct >= 80
                            ? "text-success-strong dark:text-success"
                            : pct >= 50
                              ? "text-warning"
                              : "text-accent",
                        )}
                      >
                        {t.correct} / {t.total}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-accent",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : missed.length ? (
            <p className="mt-2 text-sm text-muted">
              You missed {missed.length} question{missed.length === 1 ? "" : "s"}.
              Review them and try again.
            </p>
          ) : (
            <p className="mt-2 text-sm text-success-strong dark:text-success">
              You got every question right. 🎯
            </p>
          )}
        </div>

        {/* actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            size="lg"
            onClick={() => router.push(`/quizzes/${quiz.id}`)}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4" /> Retake quiz
          </Button>
          {missed.length > 0 && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push(`/quizzes/${quiz.id}/review?attempt=${attempt.id}`)}
              className="w-full"
            >
              <ListChecks className="h-4 w-4" /> Review {missed.length} missed
            </Button>
          )}
          {sourceActions.map((a) => (
            <Button
              key={a.href}
              size="lg"
              variant="ghost"
              onClick={() => router.push(a.href)}
              className="w-full"
            >
              <a.icon className="h-4 w-4" /> {a.label}
            </Button>
          ))}
          <Button
            size="lg"
            variant="ghost"
            onClick={() => router.push("/quizzes")}
            className="w-full text-muted"
          >
            Back to quizzes <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function Metric({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div>
      <span
        className={cn(
          "text-xl font-extrabold",
          good && "text-success-strong dark:text-success",
        )}
      >
        {value}
      </span>{" "}
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

/** Buttons that use REAL source relationships — never guessed. */
function buildSourceActions(
  quiz: QuizResultView["quiz"],
  hasMissed: boolean,
): { href: string; label: string; icon: typeof BookOpen }[] {
  const s = quiz.source;
  if (!hasMissed || !s.id) return [];
  if (s.type === "material")
    return [
      { href: `/materials/${s.id}`, label: "View source material", icon: BookOpen },
    ];
  if (s.type === "deck")
    return [{ href: `/study/${s.id}`, label: "Review these cards", icon: BookOpen }];
  if (s.type === "language")
    return [
      { href: `/languages/${s.id}/practice/review`, label: "Practice these words", icon: BookOpen },
    ];
  return [];
}
