"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lightbulb,
  Languages as LanguagesIcon,
  RotateCcw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioButton } from "@/components/language/AudioButton";
import { Recorder } from "@/components/language/Recorder";
import { GlossaryText } from "@/components/language/conversation/GlossaryText";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useStore } from "@/lib/store-context";
import { getConversationProvider } from "@/lib/language/conversation";
import type {
  ConversationResponseMode,
  ConversationScenario,
  ConversationTurn,
  ConversationVocabulary,
} from "@/lib/language/conversation-types";
import type { LanguageLevel, RomanizationMode } from "@/lib/language/types";
import { cn } from "@/lib/utils";

export interface ConversationResult {
  scenarioId: string;
  startedAt: string;
  turnsCompleted: number;
  modesUsed: ConversationResponseMode[];
  vocabEncountered: string[];
  vocabAdded: string[];
  appropriateChoices: number;
  gradedChoices: number;
}

type Band = "beginner" | "intermediate" | "advanced";
function bandFor(level: LanguageLevel): Band {
  if (level === "advanced") return "advanced";
  if (level === "intermediate") return "intermediate";
  return "beginner";
}

interface Msg {
  key: string;
  role: "partner" | "learner" | "direction" | "coach";
  target?: string;
  pronunciation?: string;
  translation?: string;
  text?: string;
  model?: { target: string; pronunciation: string; translation: string } | null;
}

export function ConversationChat({
  scenario,
  profileId,
  speechLang,
  romanizationMode,
  level,
  languageFlag,
  onExit,
  onComplete,
}: {
  scenario: ConversationScenario;
  profileId: string;
  speechLang: string;
  romanizationMode: RomanizationMode;
  level: LanguageLevel;
  languageFlag: string;
  onExit: () => void;
  onComplete: (result: ConversationResult) => void;
}) {
  const provider = getConversationProvider();
  const { conversation } = useStore();
  const band = bandFor(level);
  const canRomanize = romanizationMode !== "hidden";

  const totalLearnerTurns = useMemo(
    () => scenario.turns.filter((t) => t.speaker === "learner").length,
    [scenario],
  );

  const [messages, setMessages] = useState<Msg[]>([]);
  const [turn, setTurn] = useState<ConversationTurn | null>(null);
  const [status, setStatus] = useState<
    "partner" | "awaiting" | "reviewing" | "done"
  >("partner");
  const [turnsCompleted, setTurnsCompleted] = useState(0);
  const [showRom, setShowRom] = useState(romanizationMode === "always");
  const [showTrans, setShowTrans] = useState(band === "beginner");
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());
  const [pendingContinue, setPendingContinue] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startedAtRef = useRef(new Date().toISOString());
  const turnsRef = useRef(0);
  const modesRef = useRef<Set<ConversationResponseMode>>(new Set());
  const appropriateRef = useRef(0);
  const gradedRef = useRef(0);
  const firstAttemptRef = useRef<Set<string>>(new Set());
  const encounteredRef = useRef<Set<string>>(new Set());
  const addedRef = useRef<Set<string>>(new Set());
  const finalizedRef = useRef(false);
  const startedRef = useRef(false);
  const keySeqRef = useRef(0);
  const nextKey = () => `m${keySeqRef.current++}`;

  const turnById = useCallback(
    (id: string) => scenario.turns.find((t) => t.id === id),
    [scenario],
  );

  const defaultNext = useCallback(
    (t: ConversationTurn): string | null =>
      t.responses?.find((r) => r.appropriate)?.next ?? t.next ?? null,
    [],
  );

  const finalize = useCallback(() => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    onComplete({
      scenarioId: scenario.id,
      startedAt: startedAtRef.current,
      turnsCompleted: turnsRef.current,
      modesUsed: [...modesRef.current],
      vocabEncountered: [...encounteredRef.current],
      vocabAdded: [...addedRef.current],
      appropriateChoices: appropriateRef.current,
      gradedChoices: gradedRef.current,
    });
  }, [onComplete, scenario.id]);

  // walk forward from a turn id, appending partner lines until a learner turn
  const walkFrom = useCallback(
    (startId: string | null) => {
      let id: string | null = startId;
      const queued: Msg[] = [];
      while (id) {
        const t = turnById(id);
        if (!t) {
          id = null;
          break;
        }
        if (t.direction) {
          queued.push({ key: nextKey(), role: "direction", text: t.direction });
        }
        if (t.speaker === "partner") {
          queued.push({
            key: nextKey(),
            role: "partner",
            target: t.target,
            pronunciation: t.pronunciation,
            translation: t.translation,
          });
          id = t.next ?? null;
          continue;
        }
        // learner turn — stop here
        setMessages((m) => [...m, ...queued]);
        setTurn(t);
        setStatus("awaiting");
        return;
      }
      setMessages((m) => [...m, ...queued]);
      setTurn(null);
      setStatus("done");
      finalize();
    },
    [turnById, finalize],
  );

  // start (guarded against React's double-invoked dev effects)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const start = provider.startConversation(scenario.id);
    if (!start) {
      setStatus("done");
      return;
    }
    walkFrom(scenario.firstTurnId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autoscroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const noteFirstAttempt = (turnId: string, ok: boolean) => {
    if (firstAttemptRef.current.has(turnId)) return;
    firstAttemptRef.current.add(turnId);
    gradedRef.current += 1;
    if (ok) appropriateRef.current += 1;
  };

  const completeTurn = (nextId: string | null) => {
    turnsRef.current += 1;
    setTurnsCompleted(turnsRef.current);
    setStatus("partner");
    setTurn(null);
    setPendingContinue(null);
    setTimeout(() => walkFrom(nextId), 350);
  };

  const handleChoice = (responseId: string) => {
    if (!turn) return;
    const chosen = turn.responses?.find((r) => r.id === responseId);
    if (!chosen) return;
    const res = provider.resolveChoice(turn, responseId);
    modesRef.current.add("suggested");
    noteFirstAttempt(turn.id, res.appropriate);
    setMessages((m) => [
      ...m,
      {
        key: nextKey(),
        role: "learner",
        target: chosen.target,
        pronunciation: chosen.pronunciation,
        translation: chosen.translation,
      },
    ]);
    if (res.appropriate) {
      completeTurn(res.nextTurnId);
    } else {
      setMessages((m) => [
        ...m,
        {
          key: nextKey(),
          role: "coach",
          text: res.note ?? "That doesn't quite fit here — try another response.",
        },
      ]);
      setStatus("awaiting");
    }
  };

  const handleBuild = (ok: boolean) => {
    if (!turn) return;
    modesRef.current.add("build");
    noteFirstAttempt(turn.id, ok);
    if (!ok) {
      setMessages((m) => [
        ...m,
        {
          key: nextKey(),
          role: "coach",
          text: "Not quite — check the word order and try again.",
        },
      ]);
      return;
    }
    const model = turn.model;
    setMessages((m) => [
      ...m,
      {
        key: nextKey(),
        role: "learner",
        target: model?.target ?? turn.builder?.answer.join(""),
        pronunciation: model?.pronunciation,
        translation: model?.translation,
      },
    ]);
    completeTurn(defaultNext(turn));
  };

  const handleOpen = (mode: "type" | "speak", learnerEcho: string) => {
    if (!turn) return;
    modesRef.current.add(mode);
    const evalr = provider.evaluateOpenResponse(turn);
    setMessages((m) => [
      ...m,
      {
        key: nextKey(),
        role: "learner",
        text: learnerEcho,
      },
      {
        key: nextKey(),
        role: "coach",
        text: evalr.message,
        model: evalr.model,
      },
    ]);
    // the exchange is complete, but not graded — offer a manual Continue
    turnsRef.current += 1;
    setTurnsCompleted(turnsRef.current);
    setPendingContinue(defaultNext(turn));
    setStatus("reviewing");
    setTurn(null);
  };

  const onAddWord = useCallback(
    (w: ConversationVocabulary) => {
      const { duplicate } = conversation.addVocab(
        profileId,
        {
          target: w.target,
          translation: w.translation,
          pronunciation: w.pronunciation,
        },
        scenario.id,
      );
      addedRef.current.add(w.target);
      setAddedWords((s) => new Set(s).add(w.target));
      return { duplicate };
    },
    [conversation, profileId, scenario.id],
  );

  const onWordShown = useCallback((w: ConversationVocabulary) => {
    encounteredRef.current.add(w.target);
  }, []);

  const progress = Math.min(turnsCompleted, totalLearnerTurns);

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-2xl flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
      {/* top bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold">
            {scenario.icon} {scenario.title}
          </p>
        </div>
        <button
          onClick={onExit}
          aria-label="Exit conversation"
          className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-foreground/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <ProgressBar
          value={progress}
          max={totalLearnerTurns}
          gradient="from-primary to-secondary"
          ariaLabel="Conversation progress"
        />
        <span className="shrink-0 text-xs font-bold tabular-nums text-muted">
          {progress} / {totalLearnerTurns}
        </span>
      </div>

      {/* view controls */}
      <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-xs font-semibold">
        {canRomanize && (
          <button
            onClick={() => setShowRom((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors",
              showRom
                ? "border-primary bg-primary/10 text-primary"
                : "border-border-strong text-muted",
            )}
          >
            <LanguagesIcon className="h-3.5 w-3.5" /> Pronunciation
          </button>
        )}
        <button
          onClick={() => setShowTrans((v) => !v)}
          className={cn(
            "rounded-full border px-2.5 py-1 transition-colors",
            showTrans
              ? "border-primary bg-primary/10 text-primary"
              : "border-border-strong text-muted",
          )}
        >
          Translation
        </button>
      </div>

      {/* transcript */}
      <div
        ref={scrollRef}
        className="mt-3 flex-1 space-y-3 overflow-y-auto rounded-3xl border border-border bg-gradient-to-b from-surface-2/60 to-background p-3 sm:p-4"
      >
        <SceneCard scenario={scenario} />
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <Bubble
              key={m.key}
              msg={m}
              scenario={scenario}
              speechLang={speechLang}
              showRom={showRom}
              showTrans={showTrans}
              onAddWord={onAddWord}
              onWordShown={onWordShown}
              addedWords={addedWords}
            />
          ))}
        </AnimatePresence>

        {status === "partner" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-surface-solid px-3 py-2 shadow-soft">
              <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
            </div>
          </div>
        )}
      </div>

      {/* response area */}
      <div className="mt-3">
        {status === "awaiting" && turn && (
          <ResponsePanel
            key={turn.id}
            turn={turn}
            band={band}
            speechLang={speechLang}
            showRom={showRom && canRomanize}
            onChoice={handleChoice}
            onBuild={handleBuild}
            onOpen={handleOpen}
            onRecorded={(ms) => {
              /* metadata only — never a score */
              void ms;
            }}
            profileId={profileId}
          />
        )}

        {status === "reviewing" && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              const nx = pendingContinue;
              setPendingContinue(null);
              setStatus("partner");
              setTimeout(() => walkFrom(nx), 200);
            }}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SceneCard({ scenario }: { scenario: ConversationScenario }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-solid/70 p-3 text-center text-xs text-muted">
      <span className="font-semibold text-foreground">{scenario.context}</span>
      <br />
      Goal: {scenario.goal}
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="h-1.5 w-1.5 rounded-full bg-muted"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity, delay }}
    />
  );
}

function Bubble({
  msg,
  scenario,
  speechLang,
  showRom,
  showTrans,
  onAddWord,
  onWordShown,
  addedWords,
}: {
  msg: Msg;
  scenario: ConversationScenario;
  speechLang: string;
  showRom: boolean;
  showTrans: boolean;
  onAddWord: (w: ConversationVocabulary) => { duplicate: boolean };
  onWordShown: (w: ConversationVocabulary) => void;
  addedWords: Set<string>;
}) {
  if (msg.role === "direction") {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-xs italic text-muted-2"
      >
        {msg.text}
      </motion.p>
    );
  }

  if (msg.role === "coach") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-[92%] rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-700 dark:text-amber-300"
      >
        <p className="flex items-center gap-1.5 font-semibold">
          <Lightbulb className="h-4 w-4" /> Feedback
        </p>
        <p className="mt-1 text-[13px] leading-snug">{msg.text}</p>
        {msg.model && (
          <div className="mt-2 rounded-xl bg-surface-solid p-2.5 text-foreground">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Example response
            </p>
            <p className="mt-0.5 font-semibold">{msg.model.target}</p>
            {showRom && (
              <p className="text-xs text-muted">{msg.model.pronunciation}</p>
            )}
            <p className="text-xs text-muted">{msg.model.translation}</p>
          </div>
        )}
      </motion.div>
    );
  }

  const isLearner = msg.role === "learner";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={cn("flex", isLearner ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-soft",
          isLearner
            ? "rounded-br-sm bg-gradient-to-br from-primary to-secondary text-white"
            : "rounded-bl-sm border border-border bg-surface-solid",
        )}
      >
        {msg.target ? (
          <div
            className={cn(
              "text-[15px] font-semibold",
              isLearner && "text-white",
            )}
          >
            {isLearner ? (
              msg.target
            ) : (
              <GlossaryText
                text={msg.target}
                glossary={scenario.vocabulary}
                speechLang={speechLang}
                onAdd={onAddWord}
                onWordShown={onWordShown}
                addedWords={addedWords}
              />
            )}
          </div>
        ) : (
          <p className={cn("text-[15px]", isLearner && "text-white")}>{msg.text}</p>
        )}

        {showRom && msg.pronunciation && (
          <p
            className={cn(
              "mt-0.5 text-xs",
              isLearner ? "text-white/80" : "text-muted",
            )}
          >
            {msg.pronunciation}
          </p>
        )}
        {showTrans && msg.translation && (
          <p
            className={cn(
              "mt-0.5 text-xs",
              isLearner ? "text-white/80" : "text-muted",
            )}
          >
            {msg.translation}
          </p>
        )}

        {!isLearner && msg.target && (
          <div className="mt-1.5">
            <AudioButton text={msg.target} lang={speechLang} size="sm" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Response panel                                                     */
/* ------------------------------------------------------------------ */

const MODE_LABEL: Record<ConversationResponseMode, string> = {
  suggested: "Choose",
  build: "Build",
  type: "Type",
  speak: "Speak",
};

function ResponsePanel({
  turn,
  band,
  speechLang,
  showRom,
  onChoice,
  onBuild,
  onOpen,
  onRecorded,
  profileId,
}: {
  turn: ConversationTurn;
  band: Band;
  speechLang: string;
  showRom: boolean;
  onChoice: (responseId: string) => void;
  onBuild: (ok: boolean) => void;
  onOpen: (mode: "type" | "speak", echo: string) => void;
  onRecorded: (ms: number) => void;
  profileId: string;
}) {
  const { lang } = useStore();

  const available = useMemo<ConversationResponseMode[]>(() => {
    const out: ConversationResponseMode[] = [];
    if (turn.responses?.length) out.push("suggested");
    if (turn.builder) out.push("build");
    if (turn.model) out.push("type");
    out.push("speak");
    return out;
  }, [turn]);

  const preferred: ConversationResponseMode =
    band === "advanced" && available.includes("type")
      ? "type"
      : available[0];

  // `key={turn.id}` on this component remounts it every turn, so plain
  // initialisers are enough — no reset effect needed.
  const [mode, setMode] = useState<ConversationResponseMode>(preferred);
  const [hintLevel, setHintLevel] = useState(0);
  const [typed, setTyped] = useState("");
  const [recordedMs, setRecordedMs] = useState<number | null>(null);

  const effectiveMode = available.includes(mode) ? mode : available[0];
  const hints = turn.hints;
  const hintList = hints
    ? [
        { label: "Useful vocabulary", text: hints.vocabulary },
        { label: "Sentence structure", text: hints.structure },
        { label: "Example response", text: hints.example },
      ]
    : [];

  return (
    <div className="rounded-3xl border border-border bg-surface-solid p-3 shadow-soft sm:p-4">
      {/* mode switch + hint */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full bg-surface-2 p-1">
          {available.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold transition-colors",
                effectiveMode === m
                  ? "bg-surface-solid text-primary shadow-soft"
                  : "text-muted hover:text-foreground",
              )}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        {hintList.length > 0 && (
          <button
            onClick={() => setHintLevel((n) => Math.min(n + 1, hintList.length))}
            disabled={hintLevel >= hintList.length}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/50 px-2.5 py-1 text-xs font-bold text-amber-600 disabled:opacity-40 dark:text-amber-300"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            {hintLevel === 0 ? "Hint" : `Hint ${hintLevel}/${hintList.length}`}
          </button>
        )}
      </div>

      <AnimatePresence>
        {hintLevel > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-1 overflow-hidden rounded-2xl bg-amber-400/10 p-2.5 text-xs"
          >
            {hintList.slice(0, hintLevel).map((h) => (
              <li key={h.label}>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  {h.label}:
                </span>{" "}
                <span className="text-muted">{h.text}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="mt-3">
        {effectiveMode === "suggested" && turn.responses && (
          <div className="grid gap-2">
            {turn.responses.map((r) => (
              <button
                key={r.id}
                onClick={() => onChoice(r.id)}
                className="rounded-2xl border border-border-strong px-3.5 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5"
              >
                <p className="text-sm font-semibold">{r.target}</p>
                {showRom && (
                  <p className="text-xs text-muted">{r.pronunciation}</p>
                )}
                <p className="text-xs text-muted">{r.translation}</p>
              </button>
            ))}
          </div>
        )}

        {effectiveMode === "build" && turn.builder && (
          <SentenceBuilder
            key={turn.id}
            builder={turn.builder}
            showRom={showRom}
            model={turn.model}
            onSubmit={onBuild}
          />
        )}

        {effectiveMode === "type" && (
          <div>
            <textarea
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              rows={2}
              placeholder="Type your response…"
              className="w-full resize-none rounded-2xl border border-border-strong bg-background p-3 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted">
              Your typed response won&apos;t be scored — you&apos;ll see an example
              answer to compare against.
            </p>
            <Button
              size="lg"
              className="mt-2 w-full"
              disabled={!typed.trim()}
              onClick={() => onOpen("type", typed.trim())}
            >
              Send response
            </Button>
          </div>
        )}

        {effectiveMode === "speak" && (
          <div className="space-y-3">
            {turn.model && (
              <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
                <AudioButton
                  text={turn.model.target}
                  lang={speechLang}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{turn.model.target}</p>
                  {showRom && (
                    <p className="text-xs text-muted">
                      {turn.model.pronunciation}
                    </p>
                  )}
                </div>
              </div>
            )}
            <Recorder
              onComplete={(ms) => {
                setRecordedMs(ms);
                onRecorded(ms);
                lang.recordPronunciationAttempt({
                  profileId,
                  vocabId: null,
                  lineId: null,
                  durationMs: ms,
                });
              }}
            />
            <p className="text-xs text-muted">
              Pronunciation feedback is coming soon. Record, replay, and compare
              yourself to the example above.
            </p>
            <Button
              size="lg"
              className="w-full"
              disabled={recordedMs === null}
              onClick={() => onOpen("speak", "🎤 Spoken response")}
            >
              Done — continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SentenceBuilder({
  builder,
  showRom,
  model,
  onSubmit,
}: {
  builder: { tokens: string[]; answer: string[] };
  showRom: boolean;
  model?: { target: string; pronunciation: string; translation: string };
  onSubmit: (ok: boolean) => void;
}) {
  const [bank, setBank] = useState<string[]>(() => shuffle(builder.tokens));
  const [picked, setPicked] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);

  const reset = () => {
    setBank(shuffle(builder.tokens));
    setPicked([]);
    setWrong(false);
  };

  const submit = () => {
    const ok =
      picked.length === builder.answer.length &&
      picked.every((t, i) => t === builder.answer[i]);
    setWrong(!ok);
    onSubmit(ok);
    if (!ok) {
      setTimeout(reset, 600);
    }
  };

  return (
    <div>
      <div className="min-h-12 rounded-2xl border border-dashed border-border-strong p-2">
        <div className="flex flex-wrap gap-1.5">
          {picked.map((t, i) => (
            <button
              key={`${t}-${i}`}
              onClick={() => {
                setPicked((p) => p.filter((_, idx) => idx !== i));
                setBank((b) => [...b, t]);
                setWrong(false);
              }}
              className="rounded-lg bg-primary/12 px-2.5 py-1.5 text-sm font-semibold text-primary"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {bank.map((t, i) => (
          <button
            key={`${t}-${i}`}
            onClick={() => {
              setPicked((p) => [...p, t]);
              setBank((b) => b.filter((_, idx) => idx !== i));
            }}
            className="rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1.5 text-sm font-semibold hover:border-primary"
          >
            {t}
          </button>
        ))}
      </div>

      {wrong && (
        <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">
          Not quite — the tiles reset. Try the word order again.
        </p>
      )}
      {showRom && model && (
        <p className="mt-2 text-xs text-muted">Aim for: {model.pronunciation}</p>
      )}

      <div className="mt-2 flex gap-2">
        <Button
          size="lg"
          className="flex-1"
          disabled={picked.length === 0}
          onClick={submit}
        >
          <Check className="h-4 w-4" /> Check
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={reset}
          disabled={picked.length === 0}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
