"use client";

import { FireworksProvider } from "@/components/fireworks/fireworks-context";
import { StoreProvider } from "@/lib/store-context";
import { ThemeProvider } from "@/lib/theme-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <StoreProvider>
        <FireworksProvider>{children}</FireworksProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
