"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { DeckForm } from "@/components/forms/DeckForm";
import { PageHeader } from "@/components/navigation/AppShell";
import { useStore } from "@/lib/store-context";

export default function CreateDeckPage() {
  const router = useRouter();
  const { createDeck } = useStore();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <Link
        href="/decks"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Decks
      </Link>

      <PageHeader
        title="Create a deck"
        subtitle="Name it, pick a look, and you'll add cards next."
      />

      <DeckForm
        submitLabel="Create Deck"
        onSubmit={(values) => {
          const id = createDeck(values);
          router.push(`/decks/${id}/cards/new`);
        }}
        onCancel={() => router.push("/decks")}
      />
    </div>
  );
}
