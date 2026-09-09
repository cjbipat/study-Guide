"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  HelpCircle,
  Layers,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useStore } from "@/lib/store-context";
import type { LearningItem, LearningItemType } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

const TYPE_META: Record<
  LearningItemType,
  { label: string; icon: typeof Layers; className: string }
> = {
  flashcards: { label: "Flashcards", icon: Layers, className: "bg-violet-500/12 text-violet-500" },
  quiz: { label: "Practice Quiz", icon: HelpCircle, className: "bg-blue-500/12 text-blue-500" },
  "study-guide": { label: "Study Guide", icon: BookOpen, className: "bg-emerald-500/12 text-emerald-500" },
  summary: { label: "Quick Review", icon: Zap, className: "bg-amber-500/12 text-amber-500" },
};

function hrefFor(item: LearningItem): string {
  if (item.type === "flashcards") {
    return item.deckId
      ? `/study/${item.deckId}?item=${item.id}`
      : `/materials/${item.materialId}`;
  }
  return `/learn/${item.id}`;
}

function metaFor(item: LearningItem): string {
  if (item.type === "flashcards") return `${item.cardIds?.length ?? 0} cards`;
  if (item.type === "quiz") {
    const n = item.questions?.length ?? 0;
    if (item.lastScore) {
      return `${n} questions · last ${Math.round(
        (item.lastScore.correct / Math.max(1, item.lastScore.total)) * 100,
      )}%`;
    }
    return `${n} questions`;
  }
  if (item.type === "study-guide") return `${item.sections?.length ?? 0} sections`;
  return `${item.summary?.keyPoints.length ?? 0} key points`;
}

export function LearningItemList({
  items,
  emptyHint = "Nothing created yet.",
}: {
  items: LearningItem[];
  emptyHint?: string;
}) {
  const { deleteLearningItem } = useStore();
  const [toDelete, setToDelete] = useState<LearningItem | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
        {emptyHint}
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-2.5">
        {items.map((item, i) => {
          const meta = TYPE_META[item.type];
          const Icon = meta.icon;
          return (
            <motion.li
              key={item.id}
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-surface-solid p-3.5 shadow-soft"
            >
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                  meta.className,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <Link href={hrefFor(item)} className="min-w-0 flex-1">
                <p className="truncate font-semibold hover:text-primary">
                  {item.title}
                </p>
                <p className="text-xs text-muted">
                  {meta.label} · {metaFor(item)} · {formatRelativeTime(item.createdAt)}
                </p>
              </Link>
              <button
                onClick={() => setToDelete(item)}
                aria-label="Delete"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition-opacity hover:bg-accent/10 hover:text-accent group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <Link
                href={hrefFor(item)}
                aria-label="Open"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary"
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.li>
          );
        })}
      </ul>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        labelledBy="li-del-title"
      >
        <h3 id="li-del-title" className="text-xl font-extrabold">
          Delete &quot;{toDelete?.title}&quot;?
        </h3>
        <p className="mt-2 text-muted">
          {toDelete?.type === "flashcards"
            ? "The flashcards will stay in their deck — only this grouping is removed."
            : "This can't be undone."}
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            onClick={() => {
              if (toDelete) deleteLearningItem(toDelete.id);
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
    </>
  );
}
