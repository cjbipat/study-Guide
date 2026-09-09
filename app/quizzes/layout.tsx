import type { Metadata } from "next";

export const metadata: Metadata = { title: "Quiz" };

/** Focused, chrome-free layout for the quiz player, results, and review. */
export default function QuizFocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
