"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AudioButton } from "@/components/language/AudioButton";
import { Button } from "@/components/ui/Button";
import type { Exercise } from "@/lib/language/exercises";
import type { RomanizationMode } from "@/lib/language/types";
import { cn } from "@/lib/utils";

export function ReadingCard({
  exercise,
  speechLang,
  romanizationMode,
  onAddVocab,
  onAnswer,
}: {
  exercise: Extract<Exercise, { kind: "reading" }>;
  speechLang: string;
  romanizationMode: RomanizationMode;
  onAddVocab: (w: {
    target: string;
    translation: string;
    pronunciation: string;
  }) => void;
  onAnswer: (correct: boolean, ms: number) => void;
}) {
  const { passage } = exercise;
  const [showTranslation, setShowTranslation] = useState(false);
  const [showPron, setShowPron] = useState(romanizationMode === "always");
  const [active, setActive] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [choice, setChoice] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const start = useState(() => Date.now())[0];

  useEffect(() => {
    setShowTranslation(false);
    setActive(null);
    setChoice(null);
    setAnswered(false);
    setAdded(new Set());
  }, [exercise]);

  const glossaryMap = useMemo(() => {
    const m = new Map<string, (typeof passage.glossary)[number]>();
    passage.glossary.forEach((g) => m.set(g.word, g));
    return m;
  }, [passage]);

  // tokenise: greedily match known glossary phrases, else single chars/words
  const tokens = useMemo(() => {
    const isCJK = /[一-鿿]/.test(passage.target);
    if (isCJK) {
      const out: string[] = [];
      let i = 0;
      const text = passage.target;
      const words = [...glossaryMap.keys()].sort((a, b) => b.length - a.length);
      while (i < text.length) {
        const w = words.find((x) => text.startsWith(x, i));
        if (w) {
          out.push(w);
          i += w.length;
        } else {
          out.push(text[i]);
          i += 1;
        }
      }
      return out;
    }
    return passage.target.split(/(\s+)/);
  }, [passage, glossaryMap]);

  const activeEntry = active ? glossaryMap.get(active) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">
          Reading · {passage.title}
        </p>
        <AudioButton text={passage.target} lang={speechLang} size="sm" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <button
          onClick={() => setShowTranslation((v) => !v)}
          className={cn(
            "rounded-full border px-2.5 py-1 transition-colors",
            showTranslation
              ? "border-primary bg-primary/10 text-primary"
              : "border-border-strong text-muted",
          )}
        >
          Translation
        </button>
        {romanizationMode !== "hidden" && (
          <button
            onClick={() => setShowPron((v) => !v)}
            className={cn(
              "rounded-full border px-2.5 py-1 transition-colors",
              showPron
                ? "border-primary bg-primary/10 text-primary"
                : "border-border-strong text-muted",
            )}
          >
            Pronunciation
          </button>
        )}
      </div>

      <p className="mt-4 text-2xl leading-loose">
        {tokens.map((tok, i) => {
          if (/^\s+$/.test(tok)) return tok;
          const entry = glossaryMap.get(tok);
          return (
            <span key={i} className="inline-block">
              <button
                onClick={() => setActive(tok === active ? null : tok)}
                className={cn(
                  "rounded px-0.5 transition-colors",
                  entry && "hover:bg-primary/10",
                  active === tok && "bg-primary/15",
                )}
              >
                {tok}
              </button>
              {showPron && entry && (
                <span className="block text-center text-xs font-medium text-muted-2">
                  {entry.pronunciation}
                </span>
              )}
            </span>
          );
        })}
      </p>

      <AnimatePresence>
        {activeEntry && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 p-3"
          >
            <div>
              <p className="text-lg font-bold">
                {activeEntry.word}{" "}
                <span className="text-sm font-medium text-muted">
                  {activeEntry.pronunciation}
                </span>
              </p>
              <p className="text-sm text-muted">{activeEntry.meaning}</p>
            </div>
            <div className="flex items-center gap-2">
              <AudioButton text={activeEntry.word} lang={speechLang} size="sm" />
              <button
                onClick={() => {
                  onAddVocab({
                    target: activeEntry.word,
                    translation: activeEntry.meaning,
                    pronunciation: activeEntry.pronunciation,
                  });
                  setAdded((s) => new Set(s).add(activeEntry.word));
                }}
                disabled={added.has(activeEntry.word)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1.5 text-xs font-bold text-primary disabled:opacity-50"
              >
                {added.has(activeEntry.word) ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Added
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Add to Vocabulary
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTranslation && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm text-muted"
          >
            {passage.translation}
          </motion.p>
        )}
      </AnimatePresence>

      {passage.comprehension && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm font-bold">{passage.comprehension.prompt}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {passage.comprehension.options.map((opt) => {
              const isAnswer = opt === passage.comprehension!.answer;
              const isChoice = opt === choice;
              return (
                <button
                  key={opt}
                  disabled={answered}
                  onClick={() => {
                    if (answered) return;
                    setChoice(opt);
                    setAnswered(true);
                    onAnswer(isAnswer, Date.now() - start);
                  }}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors disabled:cursor-default",
                    !answered && "border-border-strong hover:border-primary",
                    answered && isAnswer && "border-success bg-success/10 text-success-strong dark:text-success",
                    answered && isChoice && !isAnswer && "border-accent bg-accent/10 text-accent",
                    answered && !isAnswer && !isChoice && "border-border opacity-60",
                  )}
                >
                  {opt}
                  {answered && isAnswer && <Check className="h-4 w-4" />}
                  {answered && isChoice && !isAnswer && <X className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!passage.comprehension && !answered && (
        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={() => {
            setAnswered(true);
            onAnswer(true, Date.now() - start);
          }}
        >
          Done reading
        </Button>
      )}
    </div>
  );
}
