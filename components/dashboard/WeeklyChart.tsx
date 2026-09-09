"use client";

import { useReveal } from "@/components/ui/Reveal";

interface Day {
  date: string;
  reviewed: number;
  correct: number;
  xp: number;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function label(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return DOW[new Date(date + "T00:00:00").getDay()];
}

export function WeeklyChart({ data }: { data: Day[] }) {
  const { ref, shown } = useReveal({ threshold: 0.2 });
  const max = Math.max(10, ...data.map((d) => d.reviewed));
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div ref={ref}>
      <div className="flex items-stretch gap-2 sm:gap-3">
        {data.map((d, i) => {
          const ratio = Math.max(d.reviewed / max, d.reviewed > 0 ? 0.06 : 0.02);
          const acc = d.reviewed ? d.correct / d.reviewed : 0;
          const isToday = d.date === todayKey;
          return (
            <div key={d.date + i} className="group flex flex-1 flex-col items-center gap-2">
              <div className="relative flex h-40 w-full items-end justify-center">
                <span className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface-solid px-2 py-1 text-[11px] font-semibold opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
                  {d.reviewed} reviewed
                  {d.reviewed > 0 && ` · ${Math.round(acc * 100)}%`}
                </span>
                <div
                  style={{
                    height: "100%",
                    transformOrigin: "bottom",
                    transform: `scaleY(${shown ? ratio : 0})`,
                    transitionDelay: `${i * 50}ms`,
                  }}
                  className={
                    "w-full max-w-[46px] rounded-xl motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out " +
                    (d.reviewed === 0
                      ? "bg-foreground/10"
                      : isToday
                        ? "bg-gradient-to-t from-primary to-accent"
                        : "bg-gradient-to-t from-primary/70 to-secondary/70")
                  }
                />
              </div>
              <span
                className={
                  "text-xs font-semibold " + (isToday ? "text-primary" : "text-muted")
                }
              >
                {label(d.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
