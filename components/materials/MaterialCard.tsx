"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Eye,
  FileText,
  HelpCircle,
  Layers,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MaterialPreview } from "@/components/materials/MaterialPreview";
import { STATUS_META } from "@/components/materials/status";
import { KIND_META } from "@/lib/materials/file-utils";
import { formatBytes } from "@/lib/store";
import { useStore } from "@/lib/store-context";
import type { MaterialWithMeta } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

export function MaterialCard({
  material,
  index = 0,
}: {
  material: MaterialWithMeta;
  index?: number;
}) {
  const { deleteMaterial } = useStore();
  const meta = KIND_META[material.kind];
  const Icon = meta.icon;
  const [previewing, setPreviewing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stats = [
    { n: material.flashcardCount, label: "Flashcard", Icon: Layers },
    { n: material.quizCount, label: "Quiz", labelPlural: "Quizzes", Icon: HelpCircle },
    { n: material.guideCount, label: "Study Guide", Icon: BookOpen },
    { n: material.summaryCount, label: "Quick Review", Icon: FileText },
  ].filter((s) => s.n > 0);

  return (
    <>
      <motion.div
        initial={{ y: 16 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
        className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-surface-solid p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
              meta.className,
            )}
          >
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/materials/${material.id}`}
              className="line-clamp-2 font-bold leading-snug hover:text-primary"
            >
              {material.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
              <span className={cn("rounded-md px-1.5 py-0.5 font-bold", meta.badge)}>
                {meta.label}
              </span>
              <span>{formatBytes(material.size)}</span>
              <span aria-hidden>·</span>
              <span>Added {formatRelativeTime(material.addedAt)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
              STATUS_META[material.masteryStatus].className,
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                STATUS_META[material.masteryStatus].dot,
              )}
            />
            {STATUS_META[material.masteryStatus].label}
          </span>
          {material.deckName && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
              <Layers className="h-3.5 w-3.5" /> {material.deckName}
            </span>
          )}
        </div>

        {/* mastery bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted">
              {material.mastery === null ? "Not studied" : "Mastery"}
            </span>
            {material.mastery !== null && (
              <span className="text-foreground">{material.mastery}%</span>
            )}
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-500"
              style={{ width: `${material.mastery ?? 0}%` }}
            />
          </div>
        </div>

        <div className="mt-3 min-h-[1.25rem]">
          {stats.length > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
              {stats.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1">
                  <s.Icon className="h-3.5 w-3.5" />
                  {s.n}{" "}
                  {s.n === 1 ? s.label : (s.labelPlural ?? s.label + "s")}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-2">Nothing created yet</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreviewing(true)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
              aria-label="Preview material"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-accent/10 hover:text-accent"
              aria-label="Delete material"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <Link
            href={`/materials/${material.id}`}
            className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:gap-1.5"
          >
            Open Material <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>

      <Modal
        open={previewing}
        onClose={() => setPreviewing(false)}
        labelledBy="mat-card-preview"
        className="max-w-3xl"
      >
        <h3 id="mat-card-preview" className="pr-8 text-lg font-extrabold">
          {material.name}
        </h3>
        <div className="mt-4">
          <MaterialPreview material={material} />
        </div>
        <div className="mt-4 flex gap-3">
          <Button href={`/materials/${material.id}`}>Open material</Button>
          <Button variant="ghost" onClick={() => setPreviewing(false)}>
            Close
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        labelledBy="mat-card-del"
      >
        <h3 id="mat-card-del" className="text-xl font-extrabold">
          Remove &quot;{material.name}&quot;?
        </h3>
        <p className="mt-2 text-muted">
          The source file and anything generated from it (quizzes, guides,
          summaries) will be removed. Flashcards already added to a deck stay.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            onClick={() => {
              deleteMaterial(material.id);
              setConfirmDelete(false);
            }}
          >
            Remove material
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
