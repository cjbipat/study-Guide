"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AudioButton } from "@/components/language/AudioButton";
import type { ConversationVocabulary } from "@/lib/language/conversation-types";
import { cn } from "@/lib/utils";

/**
 * Renders target-language text with tappable words. A tap opens a small card
 * with pronunciation + meaning + example and an "Add to Vocabulary" button.
 *
 * Words are matched against the scenario's own vocabulary list — no guessing.
 */
export function GlossaryText({
  text,
  glossary,
  speechLang,
  className,
  onWordShown,
  onAdd,
  addedWords,
}: {
  text: string;
  glossary: ConversationVocabulary[];
  speechLang: string;
  className?: string;
  /** fired once per glossary word that appears in this text */
  onWordShown?: (word: ConversationVocabulary) => void;
  /** returns whether the word was already in the learner's vocabulary */
  onAdd: (word: ConversationVocabulary) => { duplicate: boolean };
  addedWords: Set<string>;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [dupNote, setDupNote] = useState<string | null>(null);

  const glossaryMap = useMemo(() => {
    const m = new Map<string, ConversationVocabulary>();
    glossary.forEach((g) => m.set(g.target, g));
    return m;
  }, [glossary]);

  const tokens = useMemo(() => {
    const isCJK = /[㐀-鿿぀-ヿ]/.test(text);
    const words = [...glossaryMap.keys()].sort((a, b) => b.length - a.length);
    if (isCJK) {
      const out: string[] = [];
      let i = 0;
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
    // latin scripts — split on spaces, then try to match multi-word phrases
    const raw = text.split(/(\s+)/);
    const out: string[] = [];
    for (let i = 0; i < raw.length; i++) {
      const piece = raw[i];
      if (/^\s+$/.test(piece)) {
        out.push(piece);
        continue;
      }
      const bare = piece.replace(/[.,!?¿¡;:"“”]/g, "").toLowerCase();
      const phrase = words.find((w) => w.toLowerCase() === bare);
      out.push(phrase ?? piece);
    }
    return out;
  }, [text, glossaryMap]);

  // notify parent of every glossary word rendered here
  useEffect(() => {
    if (!onWordShown) return;
    const seen = new Set<string>();
    for (const t of tokens) {
      const key = t.replace(/[.,!?¿¡;:"“”]/g, "");
      const entry = glossaryMap.get(t) ?? glossaryMap.get(key);
      if (entry && !seen.has(entry.target)) {
        seen.add(entry.target);
        onWordShown(entry);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  const activeEntry = active
    ? glossaryMap.get(active) ?? glossaryMap.get(active.replace(/[.,!?¿¡;:"“”]/g, ""))
    : null;

  return (
    <>
      <span className={cn("leading-relaxed", className)}>
        {tokens.map((tok, i) => {
          if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
          const key = tok.replace(/[.,!?¿¡;:"“”]/g, "");
          const entry = glossaryMap.get(tok) ?? glossaryMap.get(key);
          if (!entry) return <span key={i}>{tok}</span>;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDupNote(null);
                setActive(active === tok ? null : tok);
              }}
              className={cn(
                "-mx-0.5 rounded px-0.5 underline decoration-dotted decoration-1 underline-offset-4 transition-colors hover:bg-primary/15",
                active === tok && "bg-primary/20",
              )}
            >
              {tok}
            </button>
          );
        })}
      </span>

      <AnimatePresence>
        {activeEntry && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface-solid p-3 text-left shadow-soft"
          >
            <span className="min-w-0">
              <span className="block text-base font-bold text-foreground">
                {activeEntry.target}{" "}
                <span className="text-sm font-medium text-muted">
                  {activeEntry.pronunciation}
                </span>
              </span>
              <span className="block text-sm text-muted">
                {activeEntry.translation}
              </span>
              {activeEntry.example && (
                <span className="mt-1 block text-xs text-muted-2">
                  {activeEntry.example}
                  {activeEntry.exampleTranslation
                    ? ` — ${activeEntry.exampleTranslation}`
                    : ""}
                </span>
              )}
              {dupNote && (
                <span className="mt-1 block text-xs font-semibold text-muted">
                  {dupNote}
                </span>
              )}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-2">
              <AudioButton
                text={activeEntry.target}
                lang={speechLang}
                size="sm"
              />
              {addedWords.has(activeEntry.target) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1.5 text-xs font-bold text-success-strong dark:text-success">
                  <Check className="h-3.5 w-3.5" /> Added
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const { duplicate } = onAdd(activeEntry);
                    if (duplicate) setDupNote("Already in your vocabulary.");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1.5 text-xs font-bold text-primary"
                >
                  <Plus className="h-3.5 w-3.5" /> Add to Vocabulary
                </button>
              )}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}
