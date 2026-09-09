import type { Metadata } from "next";

export const metadata: Metadata = { title: "Language practice" };

/** Focused, chrome-free layout for language sessions and practice modes. */
export default function LanguagePracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
