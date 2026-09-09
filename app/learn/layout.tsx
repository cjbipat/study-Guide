import type { Metadata } from "next";

export const metadata: Metadata = { title: "Learn" };

/** Focused, chrome-free layout for quizzes, study guides, and summaries. */
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
