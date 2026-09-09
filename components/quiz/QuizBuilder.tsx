"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store-context";
import {
  QUESTION_TYPE_LABEL,
  type Quiz,
  type QuizQuestion,
  type QuizQuestionType,
} from "@/lib/quiz/types";
import { cn, uid } from "@/lib/utils";

const MANUAL_TYPES: QuizQuestionType[] = [
  "multiple-choice",
  "true-false",
  "short-answer",
  "fill-blank",
];

function blankQuestion(type: QuizQuestionType): QuizQuestion {
  const base = { id: uid("q"), type, prompt: "" };
  switch (type) {
    case "multiple-choice":
      return { ...base, options: ["", ""], answer: "" };
    case "true-false":
      return { ...base, answer: "True" };
    default:
      return { ...base, acceptedAnswers: [""] };
  }
}

export function QuizBuilder({
  initial,
  defaultTitle = "",
}: {
  initial?: Quiz;
  defaultTitle?: string;
}) {
  const router = useRouter();
  const { quiz: quizApi } = useStore();

  const [title, setTitle] = useState(initial?.title ?? defaultTitle);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initial?.questions ?? [],
  );
  const [adding, setAdding] = useState(false);

  const valid = questions.filter(isComplete);

  function patch(i: number, next: QuizQuestion) {
    setQuestions((arr) => arr.map((q, xi) => (xi === i ? next : q)));
  }
  function move(i: number, dir: -1 | 1) {
    setQuestions((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function persist(status: "draft" | "ready") {
    const kept = status === "ready" ? valid : questions.filter((q) => q.prompt.trim());
    if (initial) {
      quizApi.update(initial.id, { title, questions: kept, status });
      router.replace(status === "ready" ? `/quizzes/${initial.id}` : "/quizzes");
      return;
    }
    const created = quizApi.create({
      title: title.trim() || "Untitled quiz",
      source: {
        type: "manual",
        id: null,
        label: title.trim() || "Untitled quiz",
        icon: "✍️",
      },
      questions: kept,
      status,
    });
    router.replace(status === "ready" ? `/quizzes/${created.id}` : "/quizzes");
  }

  return (
    <div>
      <button
        onClick={() => router.push("/quizzes/create")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Change source
      </button>

      <h1 className="text-2xl font-extrabold tracking-tight">
        {initial ? "Edit quiz" : "Create your own quiz"}
      </h1>

      <label className="mt-5 block">
        <span className="text-sm font-bold">Quiz title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Marketing Fundamentals"
          className="input mt-1"
        />
      </label>

      <div className="mt-6 space-y-3">
        {questions.map((q, i) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-surface-solid p-4 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-primary/12 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                {QUESTION_TYPE_LABEL[q.type]}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded-lg p-1 text-muted hover:text-foreground disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === questions.length - 1}
                  className="rounded-lg p-1 text-muted hover:text-foreground disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    setQuestions((arr) => arr.filter((_, xi) => xi !== i))
                  }
                  className="rounded-lg p-1 text-muted hover:text-accent"
                  aria-label="Delete question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <QuestionEditor q={q} onChange={(n) => patch(i, n)} />
            {!isComplete(q) && (
              <p className="mt-2 text-xs font-semibold text-warning">
                Incomplete — fill the prompt and mark the correct answer.
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* add */}
      <div className="mt-4">
        {adding ? (
          <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-border p-3">
            {MANUAL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setQuestions((arr) => [...arr, blankQuestion(t)]);
                  setAdding(false);
                }}
                className="rounded-full border border-border-strong px-3 py-1.5 text-sm font-semibold hover:border-primary"
              >
                {QUESTION_TYPE_LABEL[t]}
              </button>
            ))}
            <button
              onClick={() => setAdding(false)}
              className="text-sm font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add question
          </Button>
        )}
      </div>

      {/* save */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button
          onClick={() => persist("ready")}
          disabled={valid.length === 0}
        >
          <Check className="h-4 w-4" /> Publish &amp; start ({valid.length})
        </Button>
        <Button variant="ghost" onClick={() => persist("draft")}>
          Save as draft
        </Button>
        {valid.length < questions.length && (
          <span className="text-xs text-muted">
            {questions.length - valid.length} incomplete question
            {questions.length - valid.length === 1 ? "" : "s"} will be dropped on publish
          </span>
        )}
      </div>
    </div>
  );
}

function isComplete(q: QuizQuestion): boolean {
  if (!q.prompt.trim()) return false;
  if (q.type === "multiple-choice") {
    const opts = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
    return opts.length >= 2 && !!q.answer && opts.includes(q.answer.trim());
  }
  if (q.type === "true-false") return q.answer === "True" || q.answer === "False";
  return (q.acceptedAnswers ?? []).some((a) => a.trim());
}

function QuestionEditor({
  q,
  onChange,
}: {
  q: QuizQuestion;
  onChange: (next: QuizQuestion) => void;
}) {
  return (
    <div className="mt-3 space-y-2.5">
      <textarea
        value={q.prompt}
        onChange={(e) => onChange({ ...q, prompt: e.target.value })}
        rows={2}
        placeholder={
          q.type === "fill-blank"
            ? "Sentence with ____ for the blank"
            : "Question prompt"
        }
        className="input resize-none text-sm"
        aria-label="Prompt"
      />

      {q.type === "multiple-choice" && (
        <div className="space-y-1.5">
          {(q.options ?? []).map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...q, answer: opt })}
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2",
                  q.answer === opt && opt
                    ? "border-success bg-success/20 text-success-strong dark:text-success"
                    : "border-border-strong text-transparent",
                )}
                aria-label="Mark correct"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <input
                value={opt}
                onChange={(e) => {
                  const options = [...(q.options ?? [])];
                  const wasAnswer = q.answer === options[oi];
                  options[oi] = e.target.value;
                  onChange({
                    ...q,
                    options,
                    answer: wasAnswer ? e.target.value : q.answer,
                  });
                }}
                placeholder={`Option ${oi + 1}`}
                className="input text-sm"
              />
              {(q.options?.length ?? 0) > 2 && (
                <button
                  onClick={() =>
                    onChange({
                      ...q,
                      options: (q.options ?? []).filter((_, xi) => xi !== oi),
                    })
                  }
                  className="text-muted hover:text-accent"
                  aria-label="Remove option"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {(q.options?.length ?? 0) < 6 && (
            <button
              onClick={() =>
                onChange({ ...q, options: [...(q.options ?? []), ""] })
              }
              className="text-xs font-semibold text-primary"
            >
              + Add option
            </button>
          )}
        </div>
      )}

      {q.type === "true-false" && (
        <div className="flex gap-2">
          {["True", "False"].map((v) => (
            <button
              key={v}
              onClick={() => onChange({ ...q, answer: v })}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-bold",
                q.answer === v
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border-strong text-muted",
              )}
            >
              {v}
            </button>
          ))}
          <span className="self-center text-xs text-muted">
            = the correct answer
          </span>
        </div>
      )}

      {(q.type === "short-answer" || q.type === "fill-blank") && (
        <input
          value={(q.acceptedAnswers ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...q,
              acceptedAnswers: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="Accepted answers, comma-separated"
          className="input text-sm"
          aria-label="Accepted answers"
        />
      )}

      <input
        value={q.explanation ?? ""}
        onChange={(e) =>
          onChange({ ...q, explanation: e.target.value || undefined })
        }
        placeholder="Explanation (optional)"
        className="input text-sm"
        aria-label="Explanation"
      />
    </div>
  );
}
