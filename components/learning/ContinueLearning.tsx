import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MasteryBadge } from "@/components/learning/MasteryBadge";
import type { LearningAreaProgress } from "@/lib/learning/types";

export function ContinueLearning({ areas }: { areas: LearningAreaProgress[] }) {
  if (areas.length === 0) return null;

  return (
    <section aria-labelledby="continue-heading" className="mt-10">
      <h2 id="continue-heading" className="mb-4 text-lg font-bold">
        Continue learning
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {areas.map((area) => (
          <Link
            key={`${area.sourceType}-${area.sourceId}`}
            href={area.action.href}
            className="group flex flex-col rounded-2xl border border-border bg-surface-solid p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {area.icon}
                </span>
                <span className="truncate font-bold">{area.title}</span>
              </div>
              <MasteryBadge signal={area.mastery} />
            </div>

            <p className="mt-3 text-sm text-muted">{area.mastery.detail}</p>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {area.meta.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-foreground/6 px-2 py-0.5 text-xs font-semibold text-muted"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:gap-1.5">
                {area.action.label} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
