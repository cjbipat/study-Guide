import { formatRelativeTime } from "@/lib/utils";
import type { UnifiedActivity } from "@/lib/learning/types";

export function RecentProgress({ items }: { items: UnifiedActivity[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recent-heading" className="mt-10">
      <h2 id="recent-heading" className="mb-4 text-lg font-bold">
        Recent progress
      </h2>
      <ul className="space-y-2">
        {items.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-solid p-3"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground/6 text-base"
              aria-hidden
            >
              {a.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{a.title}</p>
              {a.detail && (
                <p className="truncate text-xs text-muted">{a.detail}</p>
              )}
            </div>
            <time className="shrink-0 text-xs text-muted-2" dateTime={a.at}>
              {formatRelativeTime(a.at)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
