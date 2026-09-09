"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Layers,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/navigation/AppShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { DeckForm } from "@/components/forms/DeckForm";
import { DeckMaterialsPanel } from "@/components/deck/DeckMaterialsPanel";
import { LearningItemList } from "@/components/materials/LearningItemList";
import { useStore } from "@/lib/store-context";
import { cardMastery, isDue, isNew } from "@/lib/study/scheduler";
import { themeTokens } from "@/lib/deck-theme";
import { cn, formatRelativeTime } from "@/lib/utils";

type Tab = "flashcards" | "materials" | "quizzes" | "guides";

export default function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    getDeck,
    getCards,
    updateDeck,
    deleteDeck,
    deleteCard,
    learningItemsForDeck,
    snapshot,
    ready,
  } = useStore();
  const deck = getDeck(id);
  const cards = getCards(id);

  const [tab, setTab] = useState<Tab>("flashcards");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmDeleteDeck, setConfirmDeleteDeck] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? cards.filter(
          (c) =>
            c.question.toLowerCase().includes(term) ||
            c.answer.toLowerCase().includes(term) ||
            c.tags.some((t) => t.includes(term)),
        )
      : cards;
    return [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [cards, q]);

  if (!ready) return <PageSkeleton />;

  if (!deck) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon="🤔"
          title="Deck not found"
          body="This deck may have been deleted."
          action={
            <Button href="/decks" size="lg">
              Back to Decks
            </Button>
          }
        />
      </div>
    );
  }

  const tk = themeTokens(deck.theme);
  const dueCount = cards.filter((c) => !isNew(c) && isDue(c)).length;
  const newCount = cards.filter(isNew).length;
  const items = learningItemsForDeck(id);
  const deckQuizzes = snapshot.quizzes.filter(
    (q) => q.source.type === "deck" && q.source.id === id,
  );
  const guides = items.filter(
    (i) => i.type === "study-guide" || i.type === "summary",
  );

  const TABS: { id: Tab; label: string; icon: typeof Layers; count: number }[] = [
    { id: "flashcards", label: "Flashcards", icon: Layers, count: cards.length },
    { id: "materials", label: "Study Material", icon: Upload, count: deck.materialCount },
    { id: "quizzes", label: "Quizzes", icon: HelpCircle, count: deckQuizzes.length },
    { id: "guides", label: "Study Guides", icon: BookOpen, count: guides.length },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <Link
        href="/decks"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Decks
      </Link>

      {/* Deck header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-solid p-6 shadow-soft sm:p-8">
        <div
          className={cn(
            "pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br opacity-15 blur-3xl",
            tk.gradient,
          )}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-3xl shadow-soft",
                tk.gradient,
              )}
            >
              {deck.icon}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{deck.name}</h1>
              <p className="mt-1 max-w-lg text-sm text-muted">
                {deck.description || "No description yet."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted">
                <span>{cards.length} cards</span>
                <span aria-hidden>·</span>
                <span className={tk.text}>{dueCount} due</span>
                <span aria-hidden>·</span>
                <span>{newCount} new</span>
                {deck.materialCount > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      {deck.materialCount} material
                      {deck.materialCount === 1 ? "" : "s"}
                    </span>
                  </>
                )}
                <span aria-hidden>·</span>
                <span>Studied {formatRelativeTime(deck.lastStudiedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <ProgressRing value={deck.mastery} size={72} colorClass={tk.ring}>
              <div className="text-center">
                <div className="text-sm font-extrabold">{deck.mastery}%</div>
              </div>
            </ProgressRing>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-3">
          <Button
            href={`/study/${deck.id}`}
            size="lg"
            className={cn(cards.length === 0 && "pointer-events-none opacity-50")}
          >
            <Play className="h-4 w-4 fill-current" />
            {dueCount > 0 ? `Study ${dueCount} due` : "Study deck"}
          </Button>
          <Button href={`/decks/${deck.id}/cards/new`} variant="outline" size="lg">
            <Plus className="h-4 w-4" /> Add cards
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setConfirmDeleteDeck(true)}
            className="text-accent hover:bg-accent/10"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-bold transition-colors",
              tab === t.id ? "text-primary" : "text-muted hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px]",
                tab === t.id ? "bg-primary/12" : "bg-foreground/6",
              )}
            >
              {t.count}
            </span>
            {tab === t.id && (
              <motion.span
                layoutId="deck-tab"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "flashcards" && (
          <>
            {cards.length > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-surface-solid px-3.5 py-2 shadow-soft focus-within:border-primary sm:w-72">
                <Search className="h-4 w-4 text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search cards"
                  aria-label="Search cards"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
                />
              </div>
            )}

            {cards.length === 0 ? (
              <EmptyState
                icon="✏️"
                title="No cards yet"
                body="Add cards by hand, or upload study material and generate them."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button href={`/decks/${deck.id}/cards/new`} size="lg">
                      <Plus className="h-4 w-4" /> Add a card
                    </Button>
                    <Button
                      href="/materials"
                      variant="outline"
                      size="lg"
                    >
                      <Upload className="h-4 w-4" /> Upload material
                    </Button>
                  </div>
                }
              />
            ) : (
              <ul className="space-y-3">
                {filtered.map((card, i) => {
                  const mastery = cardMastery(card);
                  return (
                    <motion.li
                      key={card.id}
                      initial={{ y: 12 }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                      className="group flex items-start gap-4 rounded-2xl border border-border bg-surface-solid p-4 shadow-soft"
                    >
                      <div
                        className={cn(
                          "mt-1 hidden h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold sm:grid",
                          isNew(card)
                            ? "bg-secondary/12 text-secondary"
                            : "bg-primary/12 text-primary",
                        )}
                        title={isNew(card) ? "New card" : `${mastery}% mastered`}
                      >
                        {isNew(card) ? "New" : `${mastery}%`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{card.question}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                          {card.answer}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {card.sourceMaterialId && (
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                              from material
                            </span>
                          )}
                          {card.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-md bg-foreground/6 px-1.5 py-0.5 text-[11px] font-semibold text-muted"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <Link
                          href={`/decks/${deck.id}/cards/new?edit=${card.id}`}
                          aria-label="Edit card"
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-foreground/5 hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setCardToDelete(card.id)}
                          aria-label="Delete card"
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-accent/10 hover:text-accent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted">
                    No cards match &quot;{q}&quot;.
                  </p>
                )}
              </ul>
            )}
          </>
        )}

        {tab === "materials" && <DeckMaterialsPanel deckId={deck.id} />}

        {tab === "quizzes" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted">
                Quiz yourself on these cards — front, back, definitions, and terms.
              </p>
              <Button
                href={`/quizzes/create?source=deck&id=${id}`}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" /> Create quiz
              </Button>
            </div>
            {deckQuizzes.length === 0 ? (
              <EmptyState
                icon="📝"
                title="No quizzes for this deck yet"
                body="Turn these flashcards into a quiz to test recall in a new way."
                action={
                  <Button href={`/quizzes/create?source=deck&id=${id}`} size="lg">
                    Create a quiz
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {deckQuizzes.map((q) => {
                  const best = snapshot.quizAttempts
                    .filter((a) => a.quizId === q.id)
                    .reduce<number | null>(
                      (m, a) => Math.max(m ?? 0, a.score),
                      null,
                    );
                  return (
                    <li key={q.id}>
                      <Link
                        href={`/quizzes/${q.id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-solid p-3.5 shadow-soft transition-transform hover:-translate-y-0.5"
                      >
                        <span>
                          <span className="block font-bold">{q.title}</span>
                          <span className="block text-xs text-muted">
                            {q.questions.length} questions
                            {best !== null ? ` · best ${best}%` : " · not taken"}
                          </span>
                        </span>
                        <Play className="h-4 w-4 fill-current text-primary" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "guides" && (
          <LearningItemList
            items={guides}
            emptyHint="No study guides or summaries yet. Generate one from a study material."
          />
        )}
      </div>

      {/* Edit deck modal */}
      <Modal open={editing} onClose={() => setEditing(false)} labelledBy="edit-deck" className="max-w-2xl">
        <h2 id="edit-deck" className="text-xl font-extrabold">
          Edit deck
        </h2>
        <div className="mt-5">
          <DeckForm
            initial={{
              name: deck.name,
              description: deck.description,
              theme: deck.theme,
              icon: deck.icon,
            }}
            submitLabel="Save changes"
            onSubmit={(values) => {
              updateDeck(deck.id, values);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </Modal>

      {/* Delete deck confirm */}
      <Modal
        open={confirmDeleteDeck}
        onClose={() => setConfirmDeleteDeck(false)}
        labelledBy="del-deck"
      >
        <h2 id="del-deck" className="text-xl font-extrabold">
          Delete &quot;{deck.name}&quot;?
        </h2>
        <p className="mt-2 text-muted">
          This removes the deck and all {cards.length} cards. Study materials stay
          in your library. This can&apos;t be undone.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            onClick={() => {
              deleteDeck(deck.id);
              router.push("/decks");
            }}
          >
            Delete deck
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDeleteDeck(false)}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Delete card confirm */}
      <Modal
        open={!!cardToDelete}
        onClose={() => setCardToDelete(null)}
        labelledBy="del-card"
      >
        <h2 id="del-card" className="text-xl font-extrabold">
          Delete this card?
        </h2>
        <p className="mt-2 text-muted">This can&apos;t be undone.</p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            onClick={() => {
              if (cardToDelete) deleteCard(cardToDelete);
              setCardToDelete(null);
            }}
          >
            Delete card
          </Button>
          <Button variant="ghost" onClick={() => setCardToDelete(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
