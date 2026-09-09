"use client";

import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import {
  DEFAULT_PALETTE,
  FireworksEngine,
  type Intensity,
  type RGB,
} from "./fireworks-engine";
import { ReducedCelebration } from "./ReducedCelebration";

export interface FireworksProps {
  /** Increment / change this value to fire a burst. 0 / falsy = idle. */
  trigger: number;
  intensity?: Intensity;
  durationMs?: number;
  colors?: RGB[];
  originYRatio?: number;
  originXRatio?: number;
  /** called once the last particle has cleared */
  onComplete?: () => void;
  className?: string;
}

/**
 * Full-viewport, click-through fireworks overlay.
 *
 * The canvas render loop is fully decoupled from React — a `trigger` prop change
 * is the only thing that reaches in, and it just calls `engine.launch()`.
 *
 * The frame loop races `requestAnimationFrame` against a `setTimeout`: rAF gives
 * a smooth 60fps while the tab is visible, and the timeout guarantees the
 * animation still finishes (and cleans up) if the tab is backgrounded.
 */
export function Fireworks({
  trigger,
  intensity = "medium",
  durationMs = 1600,
  colors = DEFAULT_PALETTE,
  originYRatio = 0.42,
  originXRatio = 0.5,
  onComplete,
  className,
}: FireworksProps) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FireworksEngine | null>(null);
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTsRef = useRef(0);
  const startRef = useRef<(() => void) | null>(null);
  const startResizeRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const engine = new FireworksEngine();
    engineRef.current = engine;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w =
        window.innerWidth ||
        document.documentElement.clientWidth ||
        canvas.parentElement?.clientWidth ||
        360;
      const h =
        window.innerHeight ||
        document.documentElement.clientHeight ||
        canvas.parentElement?.clientHeight ||
        640;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.resize(w, h);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    document.addEventListener("visibilitychange", resize);

    const clearTimers = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
      rafRef.current = null;
      timeoutRef.current = null;
    };

    const frame = (now: number) => {
      clearTimers();
      const dt = lastTsRef.current ? now - lastTsRef.current : 16;
      lastTsRef.current = now;
      engine.tick(dt);
      engine.draw(ctx);

      if (engine.active) {
        schedule();
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        runningRef.current = false;
        lastTsRef.current = 0;
        onCompleteRef.current?.();
      }
    };

    function schedule() {
      // Race rAF (smooth when visible) against a timeout (progress when hidden).
      rafRef.current = requestAnimationFrame((t) => frame(t));
      timeoutRef.current = setTimeout(() => frame(performance.now()), 32);
    }

    startRef.current = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      lastTsRef.current = 0;
      schedule();
    };

    // Also re-measure right before a burst starts.
    startResizeRef.current = resize;

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      document.removeEventListener("visibilitychange", resize);
      clearTimers();
      runningRef.current = false;
      engineRef.current = null;
      startRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    if (!trigger || reduced) return;
    const engine = engineRef.current;
    if (!engine) return;
    startResizeRef.current?.();
    engine.launch({ intensity, durationMs, colors, originYRatio, originXRatio });
    startRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (reduced) {
    return <ReducedCelebration trigger={trigger} onComplete={onComplete} />;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={"pointer-events-none fixed inset-0 z-[70] " + (className ?? "")}
    />
  );
}
