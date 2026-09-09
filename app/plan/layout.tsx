import type { Metadata } from "next";

export const metadata: Metadata = { title: "Today's Plan" };

/** Focused, chrome-free layout for running the daily learning plan. */
export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
