"use client";

import { Brain, LineChart, RefreshCw, Trophy } from "lucide-react";

import { Reveal } from "@/components/ui/Reveal";

const ITEMS = [
  {
    icon: Brain,
    title: "Active Recall",
    body: "Force your brain to retrieve information instead of simply rereading it. Retrieval is what builds durable memory.",
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: RefreshCw,
    title: "Spaced Repetition",
    body: "Review information right when you're about to forget it. Our scheduler spaces every card for maximum retention with minimum time.",
    accent: "from-blue-500 to-cyan-500",
  },
  {
    icon: LineChart,
    title: "Track Your Progress",
    body: "See exactly how much you're learning — mastery per deck, accuracy trends, and a weekly picture of your effort.",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    icon: Trophy,
    title: "Make Learning Rewarding",
    body: "Every correct answer moves you forward. XP, streaks, and a celebration that actually feels earned keep you coming back.",
    accent: "from-amber-400 to-rose-500",
  },
];

export function WhySection() {
  return (
    <section id="why" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Why this works
          </p>
          <h2 className="mt-3 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Backed by how memory actually works
          </h2>
          <p className="mt-4 text-lg text-muted">
            Not gimmicks — the two most well-studied learning techniques, wrapped
            in an experience you&apos;ll want to open every day.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it, i) => (
            <Reveal
              key={it.title}
              delay={i * 0.08}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-surface-solid p-6 shadow-soft transition-transform hover:-translate-y-1"
            >
              <div
                className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${it.accent} text-white shadow-glow`}
              >
                <it.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{it.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
