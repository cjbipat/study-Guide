import { cn } from "@/lib/utils";

/** Standard elevated panel used across dashboard / decks / settings. */
export function Surface({
  className,
  children,
  as: As = "div",
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cn(
        "rounded-3xl border border-border bg-surface-solid shadow-soft",
        className,
      )}
      {...props}
    >
      {children}
    </As>
  );
}
