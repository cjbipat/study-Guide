"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { greeting } from "@/lib/utils";

const STARTERS = [
  {
    icon: "📄",
    title: "Study something",
    body: "Upload notes, PDFs, text, or slides and turn them into flashcards, quizzes, and study guides.",
    cta: "Upload material",
    href: "/materials",
  },
  {
    icon: "🧠",
    title: "Create flashcards",
    body: "Build your own deck for active recall, or generate one from material you've uploaded.",
    cta: "Create a deck",
    href: "/create",
  },
  {
    icon: "🌍",
    title: "Learn a language",
    body: "Start building vocabulary and practising listening, reading, and speaking.",
    cta: "Choose a language",
    href: "/languages/new",
  },
];

/**
 * The dashboard for a brand-new account: no fake stats, no empty analytics —
 * just a clear, premium invitation to take the first real action.
 */
export function NewUserWelcome({ name }: { name: string }) {
  const firstName = name && name !== "there" ? name.split(" ")[0] : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
      <header className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </p>
        <h1 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          Welcome to Ember
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-balance text-muted">
          Learn anything. Track your progress. Build real mastery — one study
          session at a time.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {STARTERS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col rounded-3xl border border-border bg-surface-solid p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="text-3xl" aria-hidden>
              {s.icon}
            </span>
            <h2 className="mt-4 text-lg font-extrabold tracking-tight">
              {s.title}
            </h2>
            <p className="mt-1.5 flex-1 text-sm text-muted">{s.body}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary group-hover:gap-2.5">
              {s.cta} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted-2">
        Your workspace is empty and private to this browser. Everything you add
        and every session you complete builds your real learning history.
      </p>
    </div>
  );
}
