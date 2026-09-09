"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useState } from "react";

import { AudioButton } from "@/components/language/AudioButton";
import { Button } from "@/components/ui/Button";
import type { ConversationResult } from "@/components/language/conversation/ConversationChat";
import type {
  ConversationScenario,
  ConversationVocabulary,
} from "@/lib/language/conversation-types";
import type { FinishConversationOutcome } from "@/lib/language/conversation-store";
import { conversationMilestoneHeading } from "@/lib/language/conversation-store";
import { cn } from "@/lib/utils";

export function ConversationComplete({
  scenario,
  languageName,
  result,
  outcome,
  speechLang,
  showRom,
  alreadyInVocab,
  onAddWord,
  doneHref,
  onDone,
}: {
  scenario: ConversationScenario;
  languageName: string;
  result: ConversationResult;
  outcome: FinishConversationOutcome;
  speechLang: string;
  showRom: boolean;
  /** target forms already in the learner's vocabulary before this screen */
  alreadyInVocab: Set<string>;
  onAddWord: (w: ConversationVocabulary) => { duplicate: boolean };
  doneHref: string;
  onDone: () => void;
}) {
  const words = scenario.vocabulary;
  const [added, setAdded] = useState<Set<string>>(
    () =>
      new Set(
        words
          .map((w) => w.target)
          .filter(
            (t) => result.vocabAdded.includes(t) || alreadyInVocab.has(t),
          ),
      ),
  );
  const [choosing, setChoosing] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const remaining = words.filter((w) => !added.has(w.target));

  const add = (w: ConversationVocabulary) => {
    onAddWord(w);
    setAdded((s) => new Set(s).add(w.target));
  };
  const addAll = () => remaining.forEach(add);
  const addChecked = () => {
    words.filter((w) => checked.has(w.target)).forEach(add);
    setChoosing(false);
    setChecked(new Set());
  };

  const milestone = outcome.milestone;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="rounded-[2rem] border border-border bg-surface-solid p-6 text-center shadow-soft sm:p-8"
      >
        <div className="text-5xl">{milestone ? "🎆" : "💬"}</div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          {milestone ? conversationMilestoneHeading(milestone) : "Conversation Complete"}
        </h1>
        <p className="mt-1 text-muted">{scenario.title}</p>

        {/* stat row */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          <Metric value={result.turnsCompleted} label="Exchanges" />
          <Metric value={result.vocabEncountered.length} label="Words seen" />
          <Metric
            value={
              <span className="inline-flex items-center gap-1 text-accent">
                <Sparkles className="h-4 w-4" /> {outcome.xpEarned}
              </span>
            }
            label="XP earned"
          />
        </div>

        {/* You Practiced */}
        <div className="mt-6 rounded-2xl border border-border bg-surface-2 p-4 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            You practiced
          </p>
          <ul className="mt-2 space-y-1.5">
            {scenario.practicedSummary.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm font-semibold">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-success/20 text-success-strong dark:text-success">
                  <Check className="h-3 w-3" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Words to Remember */}
        <div className="mt-4 rounded-2xl border border-border bg-surface-2 p-4 text-left">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">
              Words to remember
            </p>
            <span className="text-xs text-muted">
              {added.size}/{words.length} in review
            </span>
          </div>

          <ul className="mt-2 divide-y divide-border">
            {words.map((w) => {
              const inReview = added.has(w.target);
              return (
                <li
                  key={w.target}
                  className="flex items-center gap-2 py-2"
                >
                  {choosing && !inReview && (
                    <input
                      type="checkbox"
                      checked={checked.has(w.target)}
                      onChange={(e) =>
                        setChecked((s) => {
                          const n = new Set(s);
                          if (e.target.checked) n.add(w.target);
                          else n.delete(w.target);
                          return n;
                        })
                      }
                      className="h-4 w-4 accent-primary"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {w.target}{" "}
                      {showRom && (
                        <span className="text-xs font-medium text-muted">
                          {w.pronunciation}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">{w.translation}</p>
                  </div>
                  <AudioButton text={w.target} lang={speechLang} size="sm" />
                  {inReview ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-success-strong dark:text-success">
                      <Check className="h-3.5 w-3.5" /> Added
                    </span>
                  ) : (
                    !choosing && (
                      <button
                        onClick={() => add(w)}
                        className="shrink-0 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-bold text-primary"
                      >
                        Add
                      </button>
                    )
                  )}
                </li>
              );
            })}
          </ul>

          {remaining.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {!choosing ? (
                <>
                  <Button size="sm" onClick={addAll}>
                    Add all to review
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setChoosing(true)}
                  >
                    Choose vocabulary
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={addChecked}
                    disabled={checked.size === 0}
                  >
                    Add {checked.size || ""} to review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setChoosing(false);
                      setChecked(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-muted">
            Added words join your normal spaced review schedule.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button href={doneHref} size="lg" className="flex-1" onClick={onDone}>
            Back to {languageName} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function Metric({
  value,
  label,
}: {
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-surface-2 px-2 py-3")}>
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-[11px] font-semibold text-muted">{label}</div>
    </div>
  );
}
