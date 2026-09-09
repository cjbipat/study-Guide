import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "accent";
}) {
  const tones = {
    neutral: "bg-foreground/6 text-muted",
    primary: "bg-primary/12 text-primary",
    success: "bg-success/14 text-success-strong dark:text-success",
    warning: "bg-warning/14 text-warning",
    accent: "bg-accent/12 text-accent",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
