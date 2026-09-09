"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { useMemo, useState } from "react";

import type {
  ConversationCategory,
  ConversationLevelBand,
  ConversationProgress,
  ConversationScenarioView,
} from "@/lib/language/conversation-types";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<ConversationCategory, string> = {
  social: "Social",
  food: "Food",
  shopping: "Shopping",
  "getting-around": "Getting Around",
  family: "Family",
  work: "Work",
  travel: "Travel",
  "daily-life": "Daily Life",
};

const LEVEL_LABEL: Record<ConversationLevelBand, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function ScenarioLibrary({
  languageName,
  views,
  progress,
  onPick,
  onExit,
}: {
  languageName: string;
  views: ConversationScenarioView[];
  progress: ConversationProgress;
  onPick: (scenarioId: string) => void;
  onExit: () => void;
}) {
  const [level, setLevel] = useState<ConversationLevelBand | "all">("all");
  const [category, setCategory] = useState<ConversationCategory | "all">("all");

  const categories = useMemo(
    () => [...new Set(views.map((v) => v.scenario.category))],
    [views],
  );

  const filtered = views.filter((v) => {
    if (level !== "all" && v.scenario.level !== level) return false;
    if (category !== "all" && v.scenario.category !== category) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <button
        onClick={onExit}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {languageName}
      </button>

      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Practice Real Conversations
      </h1>
      <p className="mt-2 text-muted">
        Use what you&apos;ve learned in realistic situations.
      </p>

      {progress.totalSessions > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Stat value={progress.scenariosCompleted} label="Scenarios completed" />
          <Stat value={progress.wordsUsed} label="Words used" />
          {progress.streakDays > 0 && (
            <Stat value={progress.streakDays} label="Conversation streak" />
          )}
        </div>
      )}

      {views.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-border p-8 text-center text-muted">
          Conversation scenarios for {languageName} are coming soon.
        </p>
      ) : (
        <>
          {/* filters */}
          <div className="mt-6 space-y-2">
            <FilterRow>
              <Chip active={level === "all"} onClick={() => setLevel("all")}>
                All levels
              </Chip>
              {(["beginner", "intermediate", "advanced"] as const).map((l) => (
                <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                  {LEVEL_LABEL[l]}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow>
              <Chip
                active={category === "all"}
                onClick={() => setCategory("all")}
              >
                All topics
              </Chip>
              {categories.map((c) => (
                <Chip
                  key={c}
                  active={category === c}
                  onClick={() => setCategory(c)}
                >
                  {CATEGORY_LABEL[c]}
                </Chip>
              ))}
            </FilterRow>
          </div>

          {/* scenario cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {filtered.map((v, i) => (
              <ScenarioCard
                key={v.scenario.id}
                view={v}
                index={i}
                onPick={() => v.status !== "locked" && onPick(v.scenario.id)}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="mt-6 text-center text-sm text-muted">
              No scenarios match those filters.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ScenarioCard({
  view,
  index,
  onPick,
}: {
  view: ConversationScenarioView;
  index: number;
  onPick: () => void;
}) {
  const { scenario, status, wordsNeeded } = view;
  const locked = status === "locked";

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      onClick={onPick}
      disabled={locked}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border p-5 text-left shadow-soft transition-all",
        locked
          ? "cursor-not-allowed border-border bg-surface-2/50 opacity-70"
          : "border-border bg-surface-solid hover:-translate-y-0.5 hover:shadow-glow",
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-4xl">{scenario.icon}</span>
        <StatusPill status={status} />
      </div>
      <h3 className="mt-3 text-lg font-extrabold tracking-tight">
        {scenario.title}
      </h3>
      <p className="mt-1 text-sm text-muted">{scenario.tagline}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-2">
        <span className="rounded-full bg-foreground/6 px-2 py-0.5 capitalize">
          {scenario.level}
        </span>
        <span>·</span>
        <span>~{scenario.estimatedMinutes} min</span>
      </div>
      {locked && (
        <p className="mt-3 text-xs font-semibold text-muted">
          Learn {wordsNeeded} more word{wordsNeeded === 1 ? "" : "s"} to unlock.
        </p>
      )}
    </motion.button>
  );
}

function StatusPill({
  status,
}: {
  status: ConversationScenarioView["status"];
}) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success-strong dark:text-success">
        <Check className="h-3 w-3" /> Completed
      </span>
    );
  if (status === "locked")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/8 px-2 py-1 text-xs font-bold text-muted">
        <Lock className="h-3 w-3" /> Locked
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-1 text-xs font-bold text-primary">
      ● Available
    </span>
  );
}

function FilterRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-1.5 overflow-x-auto">{children}</div>
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
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border-strong text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="rounded-2xl bg-surface-2 px-3 py-2">
      <span className="text-lg font-extrabold">{value}</span>{" "}
      <span className="text-xs text-muted">{label}</span>
    </span>
  );
}
