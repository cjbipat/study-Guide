import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { MasteryBadge } from "@/components/learning/MasteryBadge";
import type { LearningAreaProgress } from "@/lib/learning/types";

/**
 * Every learning area, shown separately. No combined score — Biology mastery
 * and Mandarin mastery are different things and are never averaged together.
 */
export function UniversalProgress({ areas }: { areas: LearningAreaProgress[] }) {
  if (areas.length === 0) return null;

  return (
    <section aria-labelledby="progress-heading" className="mt-10">
      <h2 id="progress-heading" className="mb-4 text-lg font-bold">
        Your progress
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface-solid shadow-soft">
        {areas.map((area) => (
          <li key={`${area.sourceType}-${area.sourceId}`}>
            <Link
              href={area.action.href}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-foreground/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:p-5"
            >
              <span className="text-2xl" aria-hidden>
                {area.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{area.title}</span>
                  <MasteryBadge signal={area.mastery} />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {area.mastery.detail || area.meta.join(" · ")}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
