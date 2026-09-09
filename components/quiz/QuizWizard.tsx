"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store-context";
import {
  QUESTION_TYPE_LABEL,
  type QuizLanguageMode,
  type QuizQuestion,
  type QuizQuestionType,
  type QuizRecipe,
  type QuizSource,
} from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

const SIZES: { value: number; label: string; time: string }[] = [
  { value: 5, label: "Quick Check", time: "~3 minutes" },
  { value: 10, label: "Practice Quiz", time: "~7 minutes" },
  { value: 20, label: "Full Quiz", time: "~15 minutes" },
];

const ALL_TYPES: QuizQuestionType[] = [
  "multiple-choice",
  "true-false",
  "short-answer",
  "fill-blank",
  "matching",
];

const LANG_MODES: { value: QuizLanguageMode; label: string }[] = [
  { value: "vocabulary", label: "Vocabulary" },
  { value: "listening", label: "Listening" },
  { value: "sentence", label: "Sentence Completion" },
  { value: "reading", label: "Reading" },
  { value: "conversation", label: "Conversation Context" },
];

type Step = "setup" | "generating" | "review" | "unavailable";

export function QuizWizard({ source }: { source: QuizSource }) {
  const router = useRouter();
  const { quiz: quizApi } = useStore();

  const [step, setStep] = useState<Step>("setup");
  const [size, setSize] = useState(10);
  const [customSize, setCustomSize] = useState("");
  const [types, setTypes] = useState<QuizQuestionType[]>([
    "multiple-choice",
    "true-false",
    "short-answer",
  ]);
  const [langMode, setLangMode] = useState<QuizLanguageMode>("vocabulary");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [note, setNote] = useState<string | undefined>();
  const [failure, setFailure] = useState<{
    reason: "no-text" | "not-enough-content";
    message: string;
  } | null>(null);

  const effectiveSize = customSize
    ? Math.max(3, Math.min(40, parseInt(customSize, 10) || 0))
    : size;

  const recipe: QuizRecipe = useMemo(
    () => ({
      size: effectiveSize,
      types,
      languageMode: source.type === "language" ? langMode : undefined,
    }),
    [effectiveSize, types, langMode, source.type],
  );

  function toggleType(t: QuizQuestionType) {
    setTypes((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t],
    );
  }

  function generate() {
    setStep("generating");
    setFailure(null);
    // let the spinner render
    window.setTimeout(() => {
      const result = quizApi.generate(source, {
        ...recipe,
        types: types.length ? types : ALL_TYPES.slice(0, 3),
      });
      if (!result.ok) {
        if (result.reason === "no-text") {
          setStep("unavailable");
          setFailure({ reason: result.reason, message: result.message });
        } else {
          setFailure({ reason: result.reason, message: result.message });
          setStep("setup");
        }
        return;
      }
      setQuestions(result.questions);
      setNote(result.note);
      setStep("review");
    }, 600);
  }

  function save() {
    const created = quizApi.create({
      title: source.label,
      source: { ...source, languageMode: source.type === "language" ? langMode : undefined },
      questions,
      recipe,
      status: "ready",
    });
    router.replace(`/quizzes/${created.id}`);
  }

  return (
    <div>
      <button
        onClick={() => router.push("/quizzes/create")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Change source
      </button>

      <div className="flex items-center gap-3">
        <span className="text-3xl">{source.icon}</span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {source.label}
          </h1>
          <p className="text-xs text-muted">
            {source.type === "material"
              ? "Study material quiz"
              : source.type === "deck"
                ? "Flashcard deck quiz"
                : "Language quiz"}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* -------------------- setup -------------------- */}
        {step === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="mt-6 space-y-7"
          >
            <Group label="Quiz size">
              <div className="grid gap-2.5 sm:grid-cols-3">
                {SIZES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      setSize(s.value);
                      setCustomSize("");
                    }}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      !customSize && size === s.value
                        ? "border-primary bg-primary/10"
                        : "border-border-strong hover:border-primary",
                    )}
                  >
                    <p className="font-bold">{s.label}</p>
                    <p className="text-sm text-muted">{s.value} Questions</p>
                    <p className="text-xs text-muted-2">{s.time}</p>
                  </button>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-sm font-semibold text-muted">Custom:</span>
                <input
                  inputMode="numeric"
                  value={customSize}
                  onChange={(e) =>
                    setCustomSize(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  placeholder="#"
                  className={cn(
                    "h-9 w-20 rounded-xl border px-3 text-sm outline-none",
                    customSize
                      ? "border-primary bg-primary/10 font-bold text-primary"
                      : "border-border-strong bg-surface-solid",
                  )}
                />
                <span className="text-xs text-muted-2">3–40 questions</span>
              </div>
            </Group>

            <Group label="Question types">
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={types.length === ALL_TYPES.length}
                  onClick={() => setTypes([...ALL_TYPES])}
                >
                  All
                </Chip>
                {ALL_TYPES.map((t) => (
                  <Chip key={t} active={types.includes(t)} onClick={() => toggleType(t)}>
                    {QUESTION_TYPE_LABEL[t]}
                  </Chip>
                ))}
              </div>
              {types.length === 0 && (
                <p className="mt-2 text-xs font-semibold text-accent">
                  Pick at least one type.
                </p>
              )}
            </Group>

            {source.type === "language" && (
              <Group label="Content">
                <div className="flex flex-wrap gap-2">
                  {LANG_MODES.map((m) => (
                    <Chip
                      key={m.value}
                      active={langMode === m.value}
                      onClick={() => setLangMode(m.value)}
                    >
                      {m.label}
                    </Chip>
                  ))}
                </div>
              </Group>
            )}

            {failure && failure.reason === "not-enough-content" && (
              <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {failure.message}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => router.push("/quizzes/create")}>
                Cancel
              </Button>
              <Button onClick={generate} disabled={types.length === 0}>
                <Sparkles className="h-4 w-4" /> Generate quiz
              </Button>
            </div>
          </motion.div>
        )}

        {/* -------------------- generating -------------------- */}
        {step === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-10 flex flex-col items-center py-10 text-center"
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 font-bold">Building your quiz…</p>
            <p className="mt-1 text-sm text-muted">
              Reading the real content from {source.label}
            </p>
          </motion.div>
        )}

        {/* -------------------- unavailable -------------------- */}
        {step === "unavailable" && failure && (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 space-y-4"
          >
            <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/8 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div className="text-sm">
                <p className="font-bold text-foreground">We Need Readable Text</p>
                <p className="mt-1 text-muted">{failure.message}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() =>
                  router.push(`/quizzes/create?source=manual&title=${encodeURIComponent(source.label)}`)
                }
              >
                Add Questions Manually
              </Button>
              {source.type === "material" && source.id && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/materials/${source.id}#create`)}
                >
                  Build Flashcards Manually
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => router.push(`/quizzes/create?source=${source.type}`)}
              >
                Try Another Material
              </Button>
            </div>
            <p className="text-xs text-muted-2">
              Future processing providers (PDF / image text extraction) plug into
              this same flow — no redesign needed.
            </p>
          </motion.div>
        )}

        {/* -------------------- review -------------------- */}
        {step === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-6 space-y-4"
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Built from real content · review and edit before you start
            </p>
            {note && (
              <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
                {note}
              </p>
            )}

            <ul className="max-h-[52vh] space-y-2.5 overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <li
                  key={q.id}
                  className="rounded-2xl border border-border bg-surface-solid p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                      {QUESTION_TYPE_LABEL[q.type]}
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
                    {q.type === "matching"
                      ? `${q.pairs?.length ?? 0} pairs`
                      : `Answer: ${q.answer ?? q.acceptedAnswers?.[0] ?? "—"}`}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <Button variant="ghost" onClick={() => setStep("setup")}>
                Back
              </Button>
              <Button onClick={save} disabled={questions.length === 0}>
                <Check className="h-4 w-4" /> Save &amp; start ({questions.length})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
        "h-9 rounded-full border px-3.5 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border-strong bg-surface-solid text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
