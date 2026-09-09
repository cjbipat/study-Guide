import type { MaterialStatus } from "@/lib/types";

export const STATUS_META: Record<
  MaterialStatus,
  { label: string; className: string; dot: string }
> = {
  new: {
    label: "New",
    className: "bg-foreground/8 text-muted",
    dot: "bg-muted-2",
  },
  learning: {
    label: "Learning",
    className: "bg-secondary/14 text-secondary",
    dot: "bg-secondary",
  },
  reviewing: {
    label: "Reviewing",
    className: "bg-warning/14 text-warning",
    dot: "bg-warning",
  },
  mastered: {
    label: "Mastered",
    className: "bg-success/16 text-success-strong dark:text-success",
    dot: "bg-success",
  },
};
