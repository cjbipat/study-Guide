import type { Metadata } from "next";

export const metadata: Metadata = { title: "Study" };

/** Focused, chrome-free layout for the study loop. */
export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
