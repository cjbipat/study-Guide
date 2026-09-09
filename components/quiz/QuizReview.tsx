"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { QUESTION_TYPE_LABEL, type QuizResultView } from "@/lib/quiz/types";

export function QuizReview({ view }: { view: QuizResultView }) {
  const { quiz, attempt, missed } = view;
  const src = quiz.source;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      <Link
        href={`/quizzes/${quiz.id}/results?attempt=${attempt.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to results
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Review missed questions
      </h1>
      <p className="mt-1 text-muted">
        {quiz.title} · {missed.length} to review
      </p>

      {missed.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-border p-8 text-center text-muted">
          You didn&apos;t miss any questions. 🎯
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {missed.map(({ question, given }) => (
            <li
              key={question.id}
              className="rounded-2xl border border-border bg-surface-solid p-4 shadow-soft"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/12 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  {QUESTION_TYPE_LABEL[question.type]}
                </span>
                {question.topic && (
                  <span className="text-[11px] font-semibold text-muted-2">
                    {question.topic}
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm font-bold">
                {question.prompt}
              </p>
              <div className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
                <p className="rounded-xl bg-accent/10 px-3 py-2 text-accent">
                  <span className="text-xs font-bold uppercase">Your answer</span>
                  <br />
                  {given}
                </p>
                <p className="rounded-xl bg-success/10 px-3 py-2 text-success-strong dark:text-success">
                  <span className="text-xs font-bold uppercase">
                    Correct answer
                  </span>
                  <br />
                  {question.type === "matching"
                    ? (question.pairs ?? [])
                        .map((p) => `${p.left} → ${p.right}`)
                        .join("; ")
                    : (question.answer ?? question.acceptedAnswers?.[0] ?? "—")}
                </p>
              </div>
              {question.explanation && (
                <p className="mt-2 text-sm text-muted">{question.explanation}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* connect missed questions back to learning — real relationships only */}
      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
        <Button href={`/quizzes/${quiz.id}`} className="flex-1">
          <RotateCcw className="h-4 w-4" /> Retake quiz
        </Button>
        {src.id && src.type === "material" && (
          <Button href={`/materials/${src.id}`} variant="outline" className="flex-1">
            <BookOpen className="h-4 w-4" /> View source material
          </Button>
        )}
        {src.id && src.type === "deck" && (
          <Button href={`/study/${src.id}`} variant="outline" className="flex-1">
            <BookOpen className="h-4 w-4" /> Review these cards
          </Button>
        )}
        {src.id && src.type === "language" && (
          <Button
            href={`/languages/${src.id}/practice/review`}
            variant="outline"
            className="flex-1"
          >
            <BookOpen className="h-4 w-4" /> Practice these words
          </Button>
        )}
      </div>
    </div>
  );
}
