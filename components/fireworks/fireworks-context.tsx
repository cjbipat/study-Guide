"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { Fireworks } from "./Fireworks";
import type { Intensity, RGB } from "./fireworks-engine";

interface CelebrateOptions {
  intensity?: Intensity;
  durationMs?: number;
  colors?: RGB[];
  originYRatio?: number;
  originXRatio?: number;
}

interface FireworksContextValue {
  celebrate: (opts?: CelebrateOptions) => void;
}

const FireworksContext = createContext<FireworksContextValue | null>(null);

/**
 * One canvas for the whole app. Call `useFireworks().celebrate()` from anywhere.
 */
export function FireworksProvider({ children }: { children: React.ReactNode }) {
  const [trigger, setTrigger] = useState(0);
  const [opts, setOpts] = useState<CelebrateOptions>({});
  const lockRef = useRef(false);

  const celebrate = useCallback((next: CelebrateOptions = {}) => {
    // debounce rapid double-fires (e.g. keyboard + click)
    if (lockRef.current) return;
    lockRef.current = true;
    setTimeout(() => (lockRef.current = false), 250);
    setOpts(next);
    setTrigger((t) => t + 1);
  }, []);

  const value = useMemo(() => ({ celebrate }), [celebrate]);

  return (
    <FireworksContext.Provider value={value}>
      {children}
      <Fireworks
        trigger={trigger}
        intensity={opts.intensity ?? "medium"}
        durationMs={opts.durationMs ?? 1600}
        colors={opts.colors}
        originYRatio={opts.originYRatio ?? 0.42}
        originXRatio={opts.originXRatio ?? 0.5}
      />
    </FireworksContext.Provider>
  );
}

export function useFireworks(): FireworksContextValue {
  const ctx = useContext(FireworksContext);
  if (!ctx) throw new Error("useFireworks must be used within <FireworksProvider>");
  return ctx;
}
