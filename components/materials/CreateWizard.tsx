"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useFireworks } from "@/components/fireworks/fireworks-context";
import { CREATE_OPTIONS } from "@/components/materials/CreateOptions";
import {
  ProcessorUnavailableError,
  StudyMaterialService,
  processingDelay,
} from "@/lib/materials/processor";
import type { DraftFlashcard } from "@/lib/materials/processor";
import { useStore } from "@/lib/store-context";
import type {
  GenerationConfig,
  LearningItemType,
  QuizQuestion,
  StudyGuideSection,
  StudyMaterial,
  SummaryContent,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "setup" | "generating" | "review" | "saved" | "unavailable";

const COUNTS = [10, 20, 30];
const DIFFICULTIES: GenerationConfig["difficulty"][] = [
  "beginner",
  "intermediate",
  "advanced",
];
const FOCUSES: { value: NonNullable<GenerationConfig["focus"]>; label: string }[] = [
  { value: "concepts", label: "Key Concepts" },
  { value: "definitions", label: "Definitions" },
  { value: "facts", label: "Important Facts" },
  { value: "everything", label: "Everything" },
];

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

export function CreateWizard({
  material,
  type,
  open,
  onClose,
}: {
  material: StudyMaterial;
  type: LearningItemType | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { celebrate } = useFireworks();
  const {
    decks,
    createDeck,
    createFlashcardsFromMaterial,
    addLearningItem,
    setMaterialDeck,
  } = useStore();

  const opt = CREATE_OPTIONS.find((o) => o.type === type);
  const canGenerate = StudyMaterialService.canGenerate(material);

  const [step, setStep] = useState<Step>("setup");
  const [count, setCount] = useState<number>(20);
  const [customCount, setCustomCount] = useState("");
  const [difficulty, setDifficulty] =
    useState<GenerationConfig["difficulty"]>("intermediate");
  const [focus, setFocus] =
    useState<NonNullable<GenerationConfig["focus"]>>("concepts");
  const [deckChoice, setDeckChoice] = useState<string>(
    material.deckId ?? "__new__",
  );
  const [error, setError] = useState<string | null>(null);

  // generated drafts
  const [drafts, setDrafts] = useState<DraftFlashcard[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sections, setSections] = useState<StudyGuideSection[]>([]);
  const [summary, setSummary] = useState<SummaryContent | null>(null);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [savedDeckId, setSavedDeckId] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const effectiveCount = customCount
    ? Math.max(1, Math.min(60, parseInt(customCount, 10) || 0))
    : count;

  useEffect(() => {
    if (!open) return;
    setStep(canGenerate ? "setup" : "unavailable");
    setError(null);
    setDrafts([]);
    setQuestions([]);
    setSections([]);
    setSummary(null);
    setSavedItemId(null);
    setEditingIdx(null);
    setDeckChoice(material.deckId ?? "__new__");
  }, [open, type, canGenerate, material.deckId]);

  const needsDeck = type === "flashcards";
  const deckOptions = useMemo(() => decks, [decks]);

  if (!type || !opt) return null;

  const config: GenerationConfig = {
    count: effectiveCount,
    difficulty,
    focus,
  };

  async function generate() {
    setError(null);
    setStep("generating");
    try {
      await processingDelay(900);
      if (type === "flashcards") {
        const d = await StudyMaterialService.generateFlashcards({ material, config });
        if (!d.length) throw new Error("empty");
        setDrafts(d);
      } else if (type === "quiz") {
        const q = await StudyMaterialService.generateQuiz({ material, config });
        if (!q.length) throw new Error("empty");
        setQuestions(q);
      } else if (type === "study-guide") {
        const s = await StudyMaterialService.generateStudyGuide({ material, config });
        if (!s.length) throw new Error("empty");
        setSections(s);
      } else {
        const s = await StudyMaterialService.generateSummary({ material, config });
        setSummary(s);
      }
      setStep("review");
    } catch (e) {
      if (e instanceof ProcessorUnavailableError) {
        setStep("unavailable");
        return;
      }
      setError(
        "We couldn't pull enough structured text from this file to build that. Try a file with clearer headings or term/definition lines.",
      );
      setStep("setup");
    }
  }

  function resolveDeckId(): string {
    if (deckChoice !== "__new__") return deckChoice;
    const id = createDeck({
      name: baseName(material.name),
      description: `Created from ${material.name}`,
      theme: "violet",
      icon: "🗂️",
    });
    return id;
  }

  function save() {
    if (type === "flashcards") {
      const deckId = resolveDeckId();
      const { item } = createFlashcardsFromMaterial({
        materialId: material.id,
        deckId,
        drafts,
        config,
        source: "extracted",
        title: `Flashcards from ${baseName(material.name)}`,
      });
      if (!material.deckId) setMaterialDeck(material.id, deckId);
      setSavedItemId(item.id);
      setSavedDeckId(deckId);
    } else if (type === "quiz") {
      const item = addLearningItem({
        type: "quiz",
        materialId: material.id,
        deckId: material.deckId,
        title: `Quiz from ${baseName(material.name)}`,
        config,
        source: "extracted",
        questions,
      });
      setSavedItemId(item.id);
    } else if (type === "study-guide") {
      const item = addLearningItem({
        type: "study-guide",
        materialId: material.id,
        deckId: material.deckId,
        title: `Study guide from ${baseName(material.name)}`,
        config,
        source: "extracted",
        sections,
      });
      setSavedItemId(item.id);
    } else if (summary) {
      const item = addLearningItem({
        type: "summary",
        materialId: material.id,
        deckId: material.deckId,
        title: `Quick review of ${baseName(material.name)}`,
        config,
        source: "extracted",
        summary,
      });
      setSavedItemId(item.id);
    }
    celebrate({ intensity: "medium", durationMs: 1400 });
    setStep("saved");
  }

  const title =
    step === "saved"
      ? "All set"
      : step === "unavailable"
        ? opt.title
        : `Create Your ${opt.title === "Practice Quiz" ? "Quiz" : opt.title === "Quick Review" ? "Summary" : "Flashcards"}`;

  return (
    <Modal open={open} onClose={onClose} labelledBy="wizard-title" className="max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{opt.emoji}</span>
        <div>
          <h2 id="wizard-title" className="text-xl font-extrabold">
            {step === "review" ? `Review your ${opt.title.toLowerCase()}` : title}
          </h2>
          <p className="text-xs text-muted">
            From{" "}
            <span className="font-semibold text-foreground">{material.name}</span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {/* ---------------- unavailable ---------------- */}
          {step === "unavailable" && (
            <motion.div
              key="unavailable"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/8 p-4">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div className="text-sm">
                  <p className="font-bold text-foreground">
                    We can&apos;t read the text inside this file yet
                  </p>
                  <p className="mt-1 text-muted">
                    Automatic generation works on <strong>.txt</strong>,{" "}
                    <strong>.md</strong> and <strong>.csv</strong> files today.
                    PDF and image text extraction will run through the same
                    workflow once an AI provider is connected — no redesign
                    needed.
                  </p>
                </div>
              </div>
              {type === "flashcards" && (
                <p className="text-sm text-muted">
                  You can still build flashcards by hand — they&apos;ll stay
                  linked to this source material.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {type === "flashcards" && (
                  <Button
                    onClick={() => {
                      const deckId = resolveDeckId();
                      if (!material.deckId) setMaterialDeck(material.id, deckId);
                      onClose();
                      router.push(
                        `/decks/${deckId}/cards/new?source=${material.id}`,
                      );
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add cards manually
                  </Button>
                )}
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---------------- setup ---------------- */}
          {step === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {(type === "flashcards" || type === "quiz") && (
                <Group label={type === "quiz" ? "Number of questions" : "Number of cards"}>
                  <div className="flex flex-wrap gap-2">
                    {COUNTS.map((c) => (
                      <Chip
                        key={c}
                        active={!customCount && count === c}
                        onClick={() => {
                          setCount(c);
                          setCustomCount("");
                        }}
                      >
                        {c}
                      </Chip>
                    ))}
                    <input
                      inputMode="numeric"
                      value={customCount}
                      onChange={(e) =>
                        setCustomCount(e.target.value.replace(/\D/g, "").slice(0, 2))
                      }
                      placeholder="Custom"
                      className={cn(
                        "h-9 w-24 rounded-full border px-3 text-sm outline-none transition-colors",
                        customCount
                          ? "border-primary bg-primary/10 font-bold text-primary"
                          : "border-border-strong bg-surface-solid",
                      )}
                    />
                  </div>
                </Group>
              )}

              {(type === "flashcards" || type === "quiz") && (
                <Group label="Difficulty">
                  <div className="flex flex-wrap gap-2">
                    {DIFFICULTIES.map((d) => (
                      <Chip
                        key={d}
                        active={difficulty === d}
                        onClick={() => setDifficulty(d)}
                      >
                        <span className="capitalize">{d}</span>
                      </Chip>
                    ))}
                  </div>
                </Group>
              )}

              {(type === "flashcards" || type === "quiz") && (
                <Group label="Focus">
                  <div className="flex flex-wrap gap-2">
                    {FOCUSES.map((f) => (
                      <Chip
                        key={f.value}
                        active={focus === f.value}
                        onClick={() => setFocus(f.value)}
                      >
                        {f.label}
                      </Chip>
                    ))}
                  </div>
                </Group>
              )}

              {needsDeck && (
                <Group label="Add cards to">
                  <select
                    value={deckChoice}
                    onChange={(e) => setDeckChoice(e.target.value)}
                    className="input"
                  >
                    <option value="__new__">
                      ＋ New deck — “{baseName(material.name)}”
                    </option>
                    {deckOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.icon} {d.name}
                      </option>
                    ))}
                  </select>
                </Group>
              )}

              {(type === "study-guide" || type === "summary") && (
                <p className="rounded-2xl border border-border bg-surface-2 p-4 text-sm text-muted">
                  We&apos;ll organise the text from your material into{" "}
                  {type === "summary"
                    ? "a short overview with key points and key terms"
                    : "sections with review points"}
                  . You can edit everything before saving.
                </p>
              )}

              {error && (
                <p className="flex items-start gap-2 rounded-xl bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
                  <X className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={generate}>
                  <Sparkles className="h-4 w-4" />
                  {type === "flashcards"
                    ? "Generate Flashcards"
                    : type === "quiz"
                      ? "Generate Quiz"
                      : type === "study-guide"
                        ? "Generate Study Guide"
                        : "Generate Summary"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---------------- generating ---------------- */}
          {step === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-10 text-center"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-bold">
                Building your {opt.title.toLowerCase()}…
              </p>
              <p className="mt-1 text-sm text-muted">
                Reading the text from {material.name}
              </p>
            </motion.div>
          )}

          {/* ---------------- review ---------------- */}
          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Generated from the text in your material · review and edit before
                saving
              </p>
              {type === "flashcards" &&
                drafts.length < effectiveCount &&
                drafts.length > 0 && (
                  <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
                    We could pull {drafts.length} clear item
                    {drafts.length === 1 ? "" : "s"} from this file (you asked for{" "}
                    {effectiveCount}). Add more by hand, or upload richer notes.
                  </p>
                )}
              {type === "quiz" &&
                questions.length < effectiveCount &&
                questions.length > 0 && (
                  <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
                    We built {questions.length} question
                    {questions.length === 1 ? "" : "s"} from this file (you asked
                    for {effectiveCount}).
                  </p>
                )}

              <div className="max-h-[46vh] space-y-2.5 overflow-y-auto pr-1">
                {type === "flashcards" &&
                  drafts.map((d, i) => (
                    <DraftCardRow
                      key={i}
                      draft={d}
                      editing={editingIdx === i}
                      onEdit={() => setEditingIdx(i)}
                      onChange={(next) =>
                        setDrafts((arr) =>
                          arr.map((x, xi) => (xi === i ? next : x)),
                        )
                      }
                      onDone={() => setEditingIdx(null)}
                      onRemove={() =>
                        setDrafts((arr) => arr.filter((_, xi) => xi !== i))
                      }
                    />
                  ))}

                {type === "quiz" &&
                  questions.map((q, i) => (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-border bg-surface-solid p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                          {q.type.replace("-", " ")}
                        </span>
                        <button
                          onClick={() =>
                            setQuestions((arr) => arr.filter((_, xi) => xi !== i))
                          }
                          className="text-muted hover:text-accent"
                          aria-label="Remove question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm font-semibold">
                        {q.prompt}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Answer: <span className="font-semibold">{q.answer}</span>
                      </p>
                    </div>
                  ))}

                {type === "study-guide" &&
                  sections.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-border bg-surface-solid p-3"
                    >
                      <p className="font-bold">{s.heading}</p>
                      <ul className="mt-1 ml-4 list-disc space-y-0.5 text-sm text-muted">
                        {s.points.map((p, pi) => (
                          <li key={pi}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

                {type === "summary" && summary && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-border bg-surface-solid p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted">
                        Overview
                      </p>
                      <p className="mt-1 text-sm">{summary.overview}</p>
                    </div>
                    {summary.keyPoints.length > 0 && (
                      <div className="rounded-2xl border border-border bg-surface-solid p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted">
                          Key points
                        </p>
                        <ul className="mt-1 ml-4 list-disc space-y-0.5 text-sm">
                          {summary.keyPoints.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {summary.keyTerms.length > 0 && (
                      <div className="rounded-2xl border border-border bg-surface-solid p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted">
                          Key terms
                        </p>
                        <dl className="mt-1 space-y-1 text-sm">
                          {summary.keyTerms.map((t, i) => (
                            <div key={i}>
                              <dt className="inline font-bold">{t.term}: </dt>
                              <dd className="inline text-muted">{t.definition}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <Button variant="ghost" onClick={() => setStep("setup")}>
                  Back
                </Button>
                <Button
                  onClick={save}
                  disabled={
                    (type === "flashcards" && drafts.length === 0) ||
                    (type === "quiz" && questions.length === 0)
                  }
                >
                  <Check className="h-4 w-4" />
                  {type === "flashcards"
                    ? `Save ${drafts.length} Flashcard${drafts.length === 1 ? "" : "s"}`
                    : type === "quiz"
                      ? `Save ${questions.length} Question${questions.length === 1 ? "" : "s"}`
                      : type === "study-guide"
                        ? "Save Study Guide"
                        : "Save Summary"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---------------- saved ---------------- */}
          {step === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-success/15 text-success-strong dark:text-success">
                <Check className="h-8 w-8" />
              </div>
              <p className="mt-4 text-xl font-extrabold">
                {opt.title} created
              </p>
              <p className="mt-1 text-sm text-muted">
                Linked to {material.name}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {type === "flashcards" && savedDeckId && (
                  <>
                    <Button
                      onClick={() => {
                        onClose();
                        router.push(
                          `/study/${savedDeckId}?item=${savedItemId ?? ""}`,
                        );
                      }}
                    >
                      Study now <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        onClose();
                        router.push(`/decks/${savedDeckId}`);
                      }}
                    >
                      View deck
                    </Button>
                  </>
                )}
                {type !== "flashcards" && savedItemId && (
                  <Button
                    onClick={() => {
                      onClose();
                      router.push(`/learn/${savedItemId}`);
                    }}
                  >
                    Open {opt.title} <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" onClick={onClose}>
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full border px-4 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border-strong bg-surface-solid text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function DraftCardRow({
  draft,
  editing,
  onEdit,
  onChange,
  onDone,
  onRemove,
}: {
  draft: DraftFlashcard;
  editing: boolean;
  onEdit: () => void;
  onChange: (next: DraftFlashcard) => void;
  onDone: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-solid p-3">
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft.question}
            onChange={(e) => onChange({ ...draft, question: e.target.value })}
            rows={2}
            className="input resize-none text-sm"
            aria-label="Question"
          />
          <textarea
            value={draft.answer}
            onChange={(e) => onChange({ ...draft, answer: e.target.value })}
            rows={2}
            className="input resize-none text-sm"
            aria-label="Answer"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={onDone}>
              <Check className="h-4 w-4" /> Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{draft.question}</p>
            <p className="mt-0.5 text-sm text-muted">{draft.answer}</p>
          </div>
          <button
            onClick={onEdit}
            className="text-muted hover:text-foreground"
            aria-label="Edit card"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            className="text-muted hover:text-accent"
            aria-label="Remove card"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
