"use client";

import {
  BellRing,
  Keyboard,
  Moon,
  Paperclip,
  Smartphone,
  Sparkles,
} from "lucide-react";

import { Flashcard } from "@/components/cards/Flashcard";
import { Reveal } from "@/components/ui/Reveal";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";

const FEATURES = [
  {
    icon: Paperclip,
    title: "Bring your own material",
    body: "Attach the PDF, lecture slides, or notes a deck is built from. Your source and your cards live in one place.",
  },
  {
    icon: Keyboard,
    title: "Keyboard-first study",
    body: "Space to flip, 1–4 to rate. Your hands never leave the home row and a session flies by.",
  },
  {
    icon: Sparkles,
    title: "Celebrations you earn",
    body: "A programmatic fireworks engine — real particle physics, 60fps, gone in two seconds. Only on the answers you actually knew.",
  },
  {
    icon: BellRing,
    title: "Streaks that mean something",
    body: "One honest session a day keeps the flame lit. Miss a day and it resets — that's the point.",
  },
  {
    icon: Moon,
    title: "Designed for 1am",
    body: "A true dark mode, not an inverted afterthought. The fireworks look their best against it.",
  },
  {
    icon: Smartphone,
    title: "Pocket-ready",
    body: "On mobile the card fills the screen and the rating buttons sit under your thumb. Study on the bus without squinting.",
  },
];

export function FeatureShowcase() {
  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="mt-3 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Every detail tuned for momentum
          </h2>
        </div>

        {/* Showcase panels */}
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <Reveal
              className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft lg:col-span-2"
          >
            <h3 className="text-lg font-bold">Your week at a glance</h3>
            <p className="mt-1 text-sm text-muted">
              Cards reviewed each day, so effort is visible even when mastery is
              still climbing.
            </p>
            <div className="mt-6">
              <WeeklyChart
                data={[
                  { date: "Mon", reviewed: 32, correct: 27, xp: 0 },
                  { date: "Tue", reviewed: 18, correct: 16, xp: 0 },
                  { date: "Wed", reviewed: 41, correct: 35, xp: 0 },
                  { date: "Thu", reviewed: 25, correct: 23, xp: 0 },
                  { date: "Fri", reviewed: 12, correct: 10, xp: 0 },
                  { date: "Sat", reviewed: 37, correct: 31, xp: 0 },
                  { date: "Sun", reviewed: 24, correct: 21, xp: 0 },
                ]}
              />
            </div>
          </Reveal>

          <Reveal
              delay={0.08}
              className="flex flex-col items-center justify-center rounded-3xl border border-border bg-surface-solid p-6 text-center shadow-soft"
          >
            <ProgressRing value={87} size={128} stroke={12} colorClass="text-primary">
              <div>
                <div className="text-3xl font-extrabold">87%</div>
                <div className="text-xs font-semibold text-muted">mastery</div>
              </div>
            </ProgressRing>
            <p className="mt-4 text-sm text-muted">
              Mastery blends interval length and ease — a real read on what
              you&apos;ll remember next month.
            </p>
          </Reveal>

          <Reveal
              className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft"
          >
            <Flashcard
              theme="blue"
              question="Preview: how a card feels"
              answer="Clean, large type. Question stays put when the answer slides in."
              revealed
              minHeight="min-h-[200px]"
            />
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2">
            {FEATURES.slice(0, 4).map((f, i) => (
              <Reveal
              key={f.title}
                delay={i * 0.06}
              className="rounded-3xl border border-border bg-surface-solid p-5 shadow-soft"
              >
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {f.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {FEATURES.slice(4).map((f, i) => (
            <Reveal
              key={f.title}
              delay={i * 0.06}
              className="rounded-3xl border border-border bg-surface-solid p-5 shadow-soft"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
