"use client";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Reveal } from "@/components/ui/Reveal";
import { LANDING_STATS } from "@/lib/landing-content";

export function StatsSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] border border-border bg-gradient-to-br from-primary/10 via-surface-solid to-accent/10 p-8 shadow-soft sm:p-14">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {LANDING_STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08} className="text-center">
                <div className="text-4xl font-extrabold tracking-tight text-gradient sm:text-5xl">
                  <AnimatedCounter
                    value={s.value}
                    suffix={s.suffix}
                    decimals={"decimals" in s ? (s.decimals as number) : 0}
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-muted">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
