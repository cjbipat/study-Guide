"use client";

import Link from "next/link";
import { Plus, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/navigation/AppShell";
import { QuizCard } from "@/components/quiz/QuizCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/lib/store-context";
import { cn } from "@/lib/utils";

export default function QuizzesDashboardPage() {
  const { ready, quiz } = useStore();
  if (!ready) return <PageSkeleton />;

  const all = quiz.list();
  const withProgress = all.filter((m) => m.scoreHistory.length >= 2);
  const totalAttempts = all.reduce((n, m) => n + m.attemptCount, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            <span>📝</span> Quizzes
          </span>
        }
        subtitle="Test yourself on anything you're learning."
        action={
          <Button href="/quizzes/create" size="lg">
            <Plus className="h-4 w-4" /> Create quiz
          </Button>
        }
      />

      {all.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No quizzes yet"
          body="Build a quiz from a study material, a flashcard deck, your language vocabulary, or your own questions."
          action={
            <Button href="/quizzes/create" size="lg">
              <Plus className="h-4 w-4" /> Create your first quiz
            </Button>
          }
        />
      ) : (
        <>
          {/* progress over time */}
          {withProgress.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted">
                <TrendingUp className="h-4 w-4" /> Your progress
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {withProgress.map((m) => (
                  <Link
                    key={m.quiz.id}
                    href={`/quizzes/${m.quiz.id}`}
                    className="rounded-2xl border border-border bg-surface-solid p-4 shadow-soft transition-transform hover:-translate-y-0.5"
                  >
                    <p className="truncate text-sm font-bold">{m.quiz.title}</p>
                    <Sparkline scores={m.scoreHistory} />
                    <p className="mt-1 text-xs text-muted">
                      {m.scoreHistory.map((s, i) => (
                        <span key={i}>
                          {i > 0 && " → "}
                          {s}%
                        </span>
                      ))}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold tracking-tight">My quizzes</h2>
              <span className="text-xs font-semibold text-muted">
                {all.length} quiz{all.length === 1 ? "" : "zes"} · {totalAttempts}{" "}
                attempt{totalAttempts === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {all.map((m, i) => (
                <QuizCard key={m.quiz.id} meta={m} index={i} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const w = 120;
  const h = 34;
  const max = 100;
  const step = w / (scores.length - 1);
  const pts = scores
    .map((s, i) => `${i * step},${h - (s / max) * h}`)
    .join(" ");
  const up = scores[scores.length - 1] >= scores[0];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-9 w-full" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(up ? "stroke-success" : "stroke-accent")}
      />
    </svg>
  );
}
