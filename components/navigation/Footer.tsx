import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Study materials", href: "/materials" },
      { label: "Decks", href: "/decks" },
      { label: "Achievements", href: "/achievements" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Why it works", href: "/#why" },
      { label: "Features", href: "/#features" },
      { label: "Interactive demo", href: "/#demo" },
      { label: "Create a deck", href: "/create" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Getting started", href: "/get-started" },
      { label: "Study guide", href: "/#why" },
      { label: "Keyboard shortcuts", href: "/#features" },
      { label: "Study material", href: "/materials" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="h-8 w-8" />
              <span className="text-lg font-extrabold tracking-tight">Ember</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted">
              A flashcard app that makes spaced repetition feel like a game worth
              playing.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Ember Learning. A demo project.</p>
          <p>Inspired by open-source spaced repetition. Not affiliated with Anki.</p>
        </div>
      </div>
    </footer>
  );
}
