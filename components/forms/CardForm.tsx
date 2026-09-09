"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Music, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Flashcard } from "@/components/cards/Flashcard";
import type { DeckTheme } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface CardFormValues {
  question: string;
  answer: string;
  tags: string[];
  imageUrl?: string;
  audioUrl?: string;
}

export function CardForm({
  theme = "violet",
  onSave,
  showSaveAndAdd = true,
  submitLabel = "Save Card",
  initial,
}: {
  theme?: DeckTheme;
  onSave: (values: CardFormValues, addAnother: boolean) => void;
  showSaveAndAdd?: boolean;
  submitLabel?: string;
  initial?: Partial<CardFormValues>;
}) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [audioUrl, setAudioUrl] = useState(initial?.audioUrl ?? "");
  const [showMedia, setShowMedia] = useState(
    Boolean(initial?.imageUrl || initial?.audioUrl),
  );
  const [touched, setTouched] = useState(false);
  const [preview, setPreview] = useState(false);
  const questionRef = useRef<HTMLTextAreaElement>(null);

  const valid = question.trim() && answer.trim();

  function reset() {
    setQuestion("");
    setAnswer("");
    setTagInput("");
    setTags([]);
    setImageUrl("");
    setAudioUrl("");
    setShowMedia(false);
    setTouched(false);
    setPreview(false);
    questionRef.current?.focus();
  }

  function commit(addAnother: boolean) {
    setTouched(true);
    if (!valid) return;
    onSave(
      {
        question: question.trim(),
        answer: answer.trim(),
        tags,
        imageUrl: imageUrl.trim() || undefined,
        audioUrl: audioUrl.trim() || undefined,
      },
      addAnother,
    );
    if (addAnother) reset();
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit(false);
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="card-q" className="mb-1.5 block text-sm font-bold">
            Question <span className="text-accent">*</span>
          </label>
          <textarea
            id="card-q"
            ref={questionRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What do you want to be asked?"
            rows={2}
            autoFocus
            className="input resize-none"
          />
          {touched && !question.trim() && (
            <p className="mt-1 text-xs font-semibold text-accent">
              A question is required
            </p>
          )}
        </div>

        <div>
          <label htmlFor="card-a" className="mb-1.5 block text-sm font-bold">
            Answer <span className="text-accent">*</span>
          </label>
          <textarea
            id="card-a"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="The answer you want to recall."
            rows={3}
            className="input resize-none"
          />
          {touched && !answer.trim() && (
            <p className="mt-1 text-xs font-semibold text-accent">
              An answer is required
            </p>
          )}
        </div>

        <div>
          <label htmlFor="card-tags" className="mb-1.5 block text-sm font-bold">
            Tags <span className="font-medium text-muted">(optional)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-strong bg-surface-solid p-2 focus-within:border-primary">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-lg bg-primary/12 px-2 py-1 text-xs font-semibold text-primary"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  aria-label={`Remove tag ${t}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id="card-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
                if (e.key === "Backspace" && !tagInput && tags.length) {
                  setTags(tags.slice(0, -1));
                }
              }}
              onBlur={addTag}
              placeholder={tags.length ? "" : "Add a tag, press Enter"}
              className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-2"
            />
          </div>
        </div>

        {!showMedia ? (
          <button
            type="button"
            onClick={() => setShowMedia(true)}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ImagePlus className="h-4 w-4" /> Add image or audio
          </button>
        ) : (
          <div className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4">
            <div>
              <label htmlFor="card-img" className="mb-1 flex items-center gap-1.5 text-sm font-bold">
                <ImagePlus className="h-4 w-4" /> Image URL
              </label>
              <input
                id="card-img"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="card-audio" className="mb-1 flex items-center gap-1.5 text-sm font-bold">
                <Music className="h-4 w-4" /> Audio URL
              </label>
              <input
                id="card-audio"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://…"
                className="input"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setShowMedia(false);
                setImageUrl("");
                setAudioUrl("");
              }}
              className="text-xs font-semibold text-muted hover:text-foreground"
            >
              Remove media
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" size="lg" disabled={!valid}>
            {submitLabel}
          </Button>
          {showSaveAndAdd && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={!valid}
              onClick={() => commit(true)}
            >
              Save &amp; Add Another
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setPreview((p) => !p)}
            className="lg:hidden"
          >
            {preview ? "Hide preview" : "Preview"}
          </Button>
        </div>
      </form>

      <div
        className={cn(
          "lg:sticky lg:top-24 lg:block lg:self-start",
          preview ? "block" : "hidden",
        )}
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">
          Live preview
        </p>
        <Flashcard
          theme={theme}
          question={question.trim() || "Your question appears here"}
          answer={answer.trim() || "…and the answer here."}
          revealed
          tags={tags}
          minHeight="min-h-[200px]"
        />
        <AnimatePresence>
          {imageUrl.trim() && (
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={imageUrl}
              alt=""
              className="mt-3 max-h-40 w-full rounded-2xl border border-border object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
              onLoad={(e) => (e.currentTarget.style.display = "block")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
