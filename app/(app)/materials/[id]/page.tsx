"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Download, Pencil, Sparkles, Trash2 } from "lucide-react";
import { use, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { CreateOptions } from "@/components/materials/CreateOptions";
import { CreateWizard } from "@/components/materials/CreateWizard";
import { LearningItemList } from "@/components/materials/LearningItemList";
import { MaterialPreview } from "@/components/materials/MaterialPreview";
import { MaterialMasteryCard } from "@/components/materials/MaterialMasteryCard";
import { ContinueLearningCard } from "@/components/materials/ContinueLearningCard";
import { LearningPath } from "@/components/materials/LearningPath";
import { LearningOverview } from "@/components/materials/LearningOverview";
import { ActivityFeed } from "@/components/materials/ActivityFeed";
import { MaterialGoalCard } from "@/components/materials/MaterialGoalCard";
import { STATUS_META } from "@/components/materials/status";
import { KIND_META } from "@/lib/materials/file-utils";
import { StudyMaterialService } from "@/lib/materials/processor";
import { formatBytes } from "@/lib/store";
import { useStore } from "@/lib/store-context";
import type { LearningItemType } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    ready,
    getMaterial,
    snapshot,
    decks,
    learningItemsForMaterial,
    getMaterialProgress,
    materialActivities,
    recommendationForMaterial,
    renameMaterial,
    setMaterialDeck,
    deleteMaterial,
  } = useStore();

  const material = getMaterial(id);
  const [wizardType, setWizardType] = useState<LearningItemType | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!ready) return <PageSkeleton />;

  if (!material) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon="🤔"
          title="Material not found"
          body="This study material may have been removed."
          action={
            <Button href="/materials" size="lg">
              Back to materials
            </Button>
          }
        />
      </div>
    );
  }

  const rawMaterial = snapshot.materials.find((m) => m.id === id)!;
  const meta = KIND_META[material.kind];
  const Icon = meta.icon;
  const items = learningItemsForMaterial(id);
  const progress = getMaterialProgress(id)!;
  const recommendation = recommendationForMaterial(id)!;
  const activities = materialActivities(id);
  const canGenerate = StudyMaterialService.canGenerate(rawMaterial);
  const status = STATUS_META[progress.status];
  const hasQuiz =
    items.some((i) => i.type === "quiz") ||
    snapshot.quizzes.some(
      (q) => q.source.type === "material" && q.source.id === id,
    );
  const guideCount = items.filter(
    (i) => i.type === "study-guide" || i.type === "summary",
  ).length;
  const uploaded = new Date(material.addedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <Link
        href="/materials"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Study Material Library
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-solid p-6 shadow-soft sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "grid h-14 w-14 shrink-0 place-items-center rounded-2xl",
                meta.className,
              )}
            >
              <Icon className="h-7 w-7" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">
                  {material.name}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    status.className,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                  {status.label}
                </span>
                <button
                  onClick={() => {
                    setNameDraft(material.name);
                    setRenaming(true);
                  }}
                  className="text-muted hover:text-foreground"
                  aria-label="Rename material"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-muted">
                <span className={cn("rounded-md px-1.5 py-0.5 font-bold", meta.badge)}>
                  {meta.label}
                </span>
                <span>{formatBytes(material.size)}</span>
                <span aria-hidden>·</span>
                <span>Uploaded {uploaded}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="font-semibold text-muted">Deck:</span>
                <select
                  value={material.deckId ?? ""}
                  onChange={(e) => setMaterialDeck(id, e.target.value || null)}
                  className="rounded-lg border border-border bg-surface-solid px-2 py-1 text-xs font-semibold outline-none focus:border-primary"
                >
                  <option value="">No deck (library only)</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <a
              href={material.dataUrl}
              download={material.name}
              className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted transition-colors hover:text-foreground"
              aria-label="Download"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={() => setConfirmDelete(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted transition-colors hover:border-accent/40 hover:text-accent"
              aria-label="Delete material"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Learning overview stats */}
      <div className="mt-5">
        <LearningOverview progress={progress} guideCount={guideCount} />
      </div>

      {/* Mastery + continue learning */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <MaterialMasteryCard
          progress={progress}
          hasFlashcards={progress.cardsTotal > 0}
        />
        <ContinueLearningCard recommendation={recommendation} />
      </div>

      {/* Learning path */}
      <div className="mt-5">
        <LearningPath progress={progress} hasQuiz={hasQuiz} />
      </div>

      {/* Topics */}
      {progress.topics.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
            Topics in this material
          </h2>
          <p className="mt-1 text-xs text-muted-2">
            Extracted from the section headings in your text.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {progress.topics.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-surface-solid px-3 py-1.5 text-sm font-semibold"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Create from this material */}
      <section id="create" className="mt-10 scroll-mt-24">
        <div className="mb-4">
          <h2 className="text-xl font-extrabold tracking-tight">
            What would you like to create?
          </h2>
          <p className="mt-1 text-sm text-muted">
            {canGenerate ? (
              <>
                Ember builds these from the text in{" "}
                <span className="font-semibold text-foreground">
                  {material.name}
                </span>
                . Review everything before you save.
              </>
            ) : (
              <>
                Text extraction for {meta.label.toLowerCase()} files isn&apos;t
                wired up yet — you can still build flashcards by hand, linked to
                this source.
              </>
            )}
          </p>
        </div>
        <CreateOptions
          onSelect={(t) => {
            if (t === "quiz") {
              router.push(`/quizzes/create?source=material&id=${id}`);
            } else {
              setWizardType(t);
            }
          }}
        />
      </section>

      {/* Created + Goal */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="mb-4 text-xl font-extrabold tracking-tight">
            Created from this material
          </h2>
          <LearningItemList
            items={items}
            emptyHint="Nothing yet — pick an option above to get started."
          />
          {snapshot.quizzes.some(
            (q) => q.source.type === "material" && q.source.id === id,
          ) && (
            <ul className="mt-2.5 space-y-2.5">
              {snapshot.quizzes
                .filter((q) => q.source.type === "material" && q.source.id === id)
                .map((q) => {
                  const best = snapshot.quizAttempts
                    .filter((a) => a.quizId === q.id)
                    .reduce<number | null>((m, a) => Math.max(m ?? 0, a.score), null);
                  return (
                    <li key={q.id}>
                      <Link
                        href={`/quizzes/${q.id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-solid p-3.5 shadow-soft transition-transform hover:-translate-y-0.5"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-xl">📝</span>
                          <span>
                            <span className="block text-sm font-bold">{q.title}</span>
                            <span className="block text-xs text-muted">
                              {q.questions.length} questions
                              {best !== null ? ` · best ${best}%` : " · not taken"}
                            </span>
                          </span>
                        </span>
                        <span className="text-xs font-bold text-primary">Open</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>
        <div>
          <MaterialGoalCard materialId={id} progress={progress} />
        </div>
      </div>

      {/* Recent activity */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-extrabold tracking-tight">
          Recent activity
        </h2>
        <ActivityFeed activities={activities} />
      </section>

      {/* Preview */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold tracking-tight">
          Source preview
          {material.textTruncated && (
            <span className="rounded-md bg-warning/12 px-1.5 py-0.5 text-[10px] font-bold uppercase text-warning">
              Truncated
            </span>
          )}
        </h2>
        <MaterialPreview material={rawMaterial} />
      </section>

      {!canGenerate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex items-start gap-2 rounded-2xl border border-border bg-surface-2 p-4 text-sm text-muted"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            The generation pipeline is a service layer, so a PDF and image text
            extractor can be plugged in later without changing this screen.
          </span>
        </motion.div>
      )}

      <CreateWizard
        material={rawMaterial}
        type={wizardType}
        open={wizardType !== null}
        onClose={() => setWizardType(null)}
      />

      {/* Rename */}
      <Modal open={renaming} onClose={() => setRenaming(false)} labelledBy="rename-title">
        <h3 id="rename-title" className="text-xl font-extrabold">
          Rename material
        </h3>
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          className="input mt-4"
          autoFocus
        />
        <div className="mt-5 flex gap-3">
          <Button
            onClick={() => {
              renameMaterial(id, nameDraft);
              setRenaming(false);
            }}
          >
            <Check className="h-4 w-4" /> Save
          </Button>
          <Button variant="ghost" onClick={() => setRenaming(false)}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Delete */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        labelledBy="mat-del-title"
      >
        <h3 id="mat-del-title" className="text-xl font-extrabold">
          Remove &quot;{material.name}&quot;?
        </h3>
        <p className="mt-2 text-muted">
          The source file and anything generated from it (quizzes, guides,
          summaries) will be removed, along with its activity history. Flashcards
          already in a deck stay put.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            onClick={() => {
              deleteMaterial(id);
              router.push("/materials");
            }}
          >
            Remove material
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
