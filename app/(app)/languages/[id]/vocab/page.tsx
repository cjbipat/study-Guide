"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Plus, Search, Trash2 } from "lucide-react";
import { use, useMemo, useState } from "react";

import { PageHeader } from "@/components/navigation/AppShell";
import { AudioButton } from "@/components/language/AudioButton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/lib/store-context";
import { getScheduler } from "@/lib/language/scheduler";
import type { VocabPartOfSpeech, VocabState } from "@/lib/language/types";
import { cn } from "@/lib/utils";

const STATE_STYLE: Record<VocabState, string> = {
  new: "bg-foreground/8 text-muted",
  learning: "bg-secondary/14 text-secondary",
  review: "bg-warning/14 text-warning",
  mastered: "bg-success/16 text-success-strong dark:text-success",
};

export default function VocabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { ready, lang } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | VocabState>("all");
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  if (!ready) return <PageSkeleton />;
  const meta = lang.getProfile(id);
  if (!meta) {
    return (
      <div className="p-10">
        <Button href="/languages">Back to languages</Button>
      </div>
    );
  }
  const { language } = meta;
  const scheduler = getScheduler();
  const vocab = lang.vocab(id);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return vocab
      .filter((v) => {
        if (filter !== "all" && scheduler.stateOf(v) !== filter) return false;
        if (!t) return true;
        return (
          v.target.toLowerCase().includes(t) ||
          v.translation.toLowerCase().includes(t) ||
          v.pronunciation.toLowerCase().includes(t)
        );
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [vocab, q, filter, scheduler]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <Link
        href={`/languages/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {language.flag} {language.name}
      </Link>

      <PageHeader
        title="Vocabulary"
        subtitle={`${vocab.length} words · ${vocab.filter((v) => scheduler.stateOf(v) === "mastered").length} mastered`}
        action={
          <Button size="lg" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add a word
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "new", "learning", "review", "mastered"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold capitalize transition-colors",
                filter === f
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border-strong text-muted hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-solid px-4 py-2.5 shadow-soft focus-within:border-primary sm:w-72">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search words"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📖"
          title={vocab.length === 0 ? "No vocabulary yet" : "Nothing matches"}
          body={
            vocab.length === 0
              ? "Words are added as you learn, or add your own custom words."
              : "Try a different filter or search."
          }
        />
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {filtered.map((v) => {
              const state = scheduler.stateOf(v);
              return (
                <motion.li
                  key={v.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-surface-solid p-4 shadow-soft"
                >
                  <AudioButton text={v.target} lang={language.speechLang} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {v.target}{" "}
                      <span className="text-sm font-medium text-muted">
                        {v.pronunciation}
                      </span>
                    </p>
                    <p className="text-sm text-muted">{v.translation}</p>
                  </div>
                  <span
                    className={cn(
                      "hidden rounded-full px-2 py-0.5 text-[11px] font-bold capitalize sm:inline",
                      STATE_STYLE[state],
                    )}
                  >
                    {state}
                  </span>
                  {v.custom && (
                    <button
                      onClick={() => setToDelete(v.id)}
                      className="text-muted opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
                      aria-label="Delete word"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <AddWordModal
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(input) => {
          lang.addCustomVocab(id, input);
          setAdding(false);
        }}
        romanizationLabel={
          language.romanization === "pinyin"
            ? "Pinyin"
            : language.romanization === "romaji"
              ? "Romaji"
              : "Pronunciation"
        }
      />

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        labelledBy="del-word"
      >
        <h3 id="del-word" className="text-xl font-extrabold">
          Delete this word?
        </h3>
        <p className="mt-2 text-muted">This can&apos;t be undone.</p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            onClick={() => {
              if (toDelete) lang.deleteVocab(toDelete);
              setToDelete(null);
            }}
          >
            Delete
          </Button>
          <Button variant="ghost" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function AddWordModal({
  open,
  onClose,
  onAdd,
  romanizationLabel,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: {
    target: string;
    translation: string;
    pronunciation: string;
    partOfSpeech: VocabPartOfSpeech;
    exampleSentence?: string;
    exampleTranslation?: string;
    tags: string[];
  }) => void;
  romanizationLabel: string;
}) {
  const [target, setTarget] = useState("");
  const [translation, setTranslation] = useState("");
  const [pron, setPron] = useState("");
  const [pos, setPos] = useState<VocabPartOfSpeech>("noun");

  const valid = target.trim() && translation.trim();

  return (
    <Modal open={open} onClose={onClose} labelledBy="add-word" className="max-w-md">
      <h3 id="add-word" className="text-xl font-extrabold">
        Add a word
      </h3>
      <div className="mt-4 space-y-3">
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Word in the target language"
          className="input"
          autoFocus
        />
        <input
          value={pron}
          onChange={(e) => setPron(e.target.value)}
          placeholder={romanizationLabel}
          className="input"
        />
        <input
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          placeholder="Meaning in English"
          className="input"
        />
        <select
          value={pos}
          onChange={(e) => setPos(e.target.value as VocabPartOfSpeech)}
          className="input"
        >
          {[
            "noun",
            "verb",
            "adjective",
            "adverb",
            "phrase",
            "particle",
            "pronoun",
            "number",
            "other",
          ].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-5 flex gap-3">
        <Button
          disabled={!valid}
          onClick={() =>
            onAdd({
              target: target.trim(),
              translation: translation.trim(),
              pronunciation: pron.trim(),
              partOfSpeech: pos,
              tags: ["custom"],
            })
          }
        >
          <Check className="h-4 w-4" /> Add word
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
