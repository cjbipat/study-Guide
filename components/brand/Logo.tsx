import { cn } from "@/lib/utils";

/**
 * Original mark: a rounded "spark" — two offset flame/leaf shards inside a
 * squircle. Not derived from any existing brand.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-grid place-items-center rounded-[30%] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-white shadow-glow",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none">
        <path
          d="M12 3c2.3 2.6 3.4 5 3.4 7.2A3.4 3.4 0 0 1 12 13.6a3.4 3.4 0 0 1-3.4-3.4C8.6 8 9.7 5.6 12 3Z"
          fill="currentColor"
        />
        <path
          d="M12 21c-3.6 0-6-2.3-6-5.4 0-1.5.6-2.9 1.7-4.1.2 2.5 1.9 4 4.3 4s4.1-1.5 4.3-4C21.4 12.7 22 14.1 22 15.6"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    </span>
  );
}
