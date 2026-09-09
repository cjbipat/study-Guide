"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Play } from "lucide-react";
import { Suspense, use, useState } from "react";

import { CardForm } from "@/components/forms/CardForm";
import { PageHeader } from "@/components/navigation/AppShell";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store-context";

function CardEditor({ deckId }: { deckId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const sourceId = searchParams.get("source");
  const { getDeck, getCards, getMaterial, createCard, updateCard, ready } =
    useStore();

  const deck = getDeck(deckId);
  const editingCard = editId
    ? getCards(deckId).find((c) => c.id === editId)
    : undefined;
  const sourceMaterial = sourceId ? getMaterial(sourceId) : undefined;

  const [added, setAdded] = useState<string[]>([]);

  if (!ready) return <div className="p-10 text-muted">Loading…</div>;
  if (!deck) {
    return (
      <div className="p-10">
        <p className="text-muted">Deck not found.</p>
        <Button href="/decks" className="mt-4">
          Back to Decks
        </Button>
      </div>
    );
  }

  const isEdit = Boolean(editingCard);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <Link
        href={`/decks/${deckId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {deck.name}
      </Link>

      <PageHeader
        title={isEdit ? "Edit card" : "Add cards"}
        subtitle={
          isEdit
            ? `In ${deck.name}`
            : sourceMaterial
              ? `New cards for ${deck.name}, linked to ${sourceMaterial.name}.`
              : `New cards for ${deck.name}. Keep going with "Save & Add Another".`
        }
        action={
          !isEdit && added.length > 0 ? (
            <Button href={`/study/${deckId}`} variant="secondary">
              <Play className="h-4 w-4 fill-current" /> Study now
            </Button>
          ) : undefined
        }
      />

      {!isEdit && added.length > 0 && (
        <div className="mb-6 rounded-2xl border border-success/30 bg-success/8 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-success-strong dark:text-success">
            <Check className="h-4 w-4" /> {added.length} card
            {added.length > 1 ? "s" : ""} added to this deck
          </p>
          <AnimatePresence initial={false}>
            <ul className="mt-2 space-y-1">
              {added.slice(-3).reverse().map((q, i) => (
                <motion.li
                  key={q + i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="truncate text-xs text-muted"
                >
                  • {q}
                </motion.li>
              ))}
            </ul>
          </AnimatePresence>
        </div>
      )}

      <CardForm
        theme={deck.theme}
        showSaveAndAdd={!isEdit}
        submitLabel={isEdit ? "Save changes" : "Save Card"}
        initial={
          editingCard
            ? {
                question: editingCard.question,
                answer: editingCard.answer,
                tags: editingCard.tags,
                imageUrl: editingCard.imageUrl,
                audioUrl: editingCard.audioUrl,
              }
            : undefined
        }
        onSave={(values, addAnother) => {
          if (editingCard) {
            updateCard(editingCard.id, values);
            router.push(`/decks/${deckId}`);
            return;
          }
          createCard(deckId, {
            ...values,
            sourceMaterialId: sourceMaterial?.id ?? null,
          });
          setAdded((a) => [...a, values.question]);
          if (!addAnother) {
            router.push(
              sourceMaterial
                ? `/materials/${sourceMaterial.id}`
                : `/decks/${deckId}`,
            );
          }
        }}
      />
    </div>
  );
}

export default function NewCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="p-10 text-muted">Loading…</div>}>
      <CardEditor deckId={id} />
    </Suspense>
  );
}
