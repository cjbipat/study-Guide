"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll-into-view reveal built on the native IntersectionObserver + CSS
 * transitions (never framer for the *visibility* of content). A hard 1.2s
 * timeout guarantees `shown` flips true no matter what, and because the resting
 * state is a plain CSS transition target, content is never permanently hidden
 * even if transitions are throttled (background tab, low-power mode).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
}) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setShown(true);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setShown(true);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            finish();
            io.disconnect();
          }
        }
      },
      {
        threshold: options?.threshold ?? 0.15,
        rootMargin: options?.rootMargin ?? "0px 0px -8% 0px",
      },
    );
    io.observe(el);
    const fallback = setTimeout(finish, 1200);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, shown };
}

type RevealTag = "div" | "section" | "li" | "figure";

export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: RevealTag;
}) {
  const { ref, shown } = useReveal<HTMLElement>();

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out will-change-transform",
        shown ? "opacity-100 translate-y-0" : "opacity-0",
        className,
      )}
      style={{
        transform: shown ? undefined : `translateY(${y}px)`,
        transitionDelay: shown ? `${delay}s` : undefined,
      }}
    >
      {children}
    </Tag>
  );
}
