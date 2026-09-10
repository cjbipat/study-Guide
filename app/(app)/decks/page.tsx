"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DeckCard } from "@/components/cards/DeckCard";
import { PageHeader } from "@/components/navigation/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/lib/store-context";

export default function DecksPage() {
  const { decks, ready } = useStore();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return decks;
    return decks.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term),
    );
  }, [decks, q]);

  const totalCards = decks.reduce((a, d) => a + d.cardCount, 0);
  const totalDue = decks.reduce((a, d) => a + d.dueCount, 0);

  if (!ready) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <PageHeader
        title="Your decks"
        subtitle={
          ready
            ? `${decks.length} decks · ${totalCards} cards · ${totalDue} due today`
            : "Loading…"
        }
        action={
          <Button href="/create" size="lg">
            <Plus className="h-4 w-4" /> Create Deck
          </Button>
        }
      />

      {decks.length > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-surface-solid px-4 py-2.5 shadow-soft focus-within:border-primary">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search decks"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
            aria-label="Search decks"
          />
        </div>
      )}

      {decks.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No flashcard decks yet"
          body="Flashcards use active recall and spaced repetition — the fastest way to move facts into long-term memory. Build a deck by hand, or generate one from study material you've uploaded."
          action={
            <Button href="/create" size="lg">
              <Plus className="h-4 w-4" /> Create your first deck
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No matches"
          body={`Nothing matched "${q}".`}
          action={
            <Button variant="outline" onClick={() => setQ("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d, i) => (
            <DeckCard key={d.id} deck={d} index={i} />
          ))}
          <Link
            href="/create"
            className="group flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary hover:bg-primary/5"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary transition-transform group-hover:scale-110">
              <Plus className="h-6 w-6" />
            </span>
            <span className="font-bold">Create Deck</span>
            <span className="text-sm text-muted">Add a new subject to study</span>
          </Link>
        </div>
      )}
    </div>
  );
}
