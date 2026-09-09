"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store-context";
import {
  DAILY_MINUTES,
  GOALS,
  LANGUAGES,
  LEVELS,
} from "@/lib/language/catalog";
import type {
  LanguageGoalKind,
  LanguageLevel,
} from "@/lib/language/types";
import { cn } from "@/lib/utils";

const PLANS: Record<number, string> = {
  5: "A quick daily touch — review + one new word.",
  10: "Review, a few new words, and a listening drill.",
  15: "A balanced session: review, learn, listen, and speak.",
  30: "A full workout across every skill, with reading.",
  60: "Deep practice — expect real progress each day.",
};

export function OnboardingWizard() {
  const router = useRouter();
  const { lang } = useStore();
  const [step, setStep] = useState(0);
  const [q, setQ] = useState("");
  const [languageId, setLanguageId] = useState<string | null>(null);
  const [level, setLevel] = useState<LanguageLevel | null>(null);
  const [goal, setGoal] = useState<LanguageGoalKind | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  const [minutes, setMinutes] = useState<number | null>(null);

  const existing = new Set(lang.profiles.map((p) => p.language.id));
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return LANGUAGES.filter(
      (l) =>
        !t ||
        l.name.toLowerCase().includes(t) ||
        l.nativeName.toLowerCase().includes(t),
    );
  }, [q]);

  const canNext =
    (step === 0 && languageId) ||
    (step === 1 && level) ||
    (step === 2 && goal && (goal !== "custom" || customGoal.trim())) ||
    (step === 3 && minutes);

  function submit() {
    if (!languageId || !level || !goal || !minutes) return;
    const id = lang.createProfile({
      languageId,
      level,
      goal,
      customGoal: goal === "custom" ? customGoal.trim() : null,
      dailyMinutes: minutes,
    });
    router.push(`/languages/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center gap-2">
        {[0, 1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              s <= step ? "bg-primary" : "bg-foreground/10",
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        >
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Choose a language
              </h1>
              <p className="mt-1 text-muted">Which language do you want to learn?</p>
              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border bg-surface-solid px-4 py-2.5 focus-within:border-primary">
                <Search className="h-4 w-4 text-muted" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search languages"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
                />
              </div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {filtered.map((l) => {
                  const already = existing.has(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => !already && setLanguageId(l.id)}
                      disabled={already}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                        already && "opacity-40",
                        languageId === l.id
                          ? "border-primary bg-primary/8"
                          : "border-border-strong hover:border-primary",
                      )}
                    >
                      <span className="text-3xl">{l.flag}</span>
                      <span>
                        <span className="block font-bold">{l.name}</span>
                        <span className="block text-xs text-muted">
                          {already ? "Already learning" : l.nativeName}
                        </span>
                      </span>
                      {languageId === l.id && (
                        <Check className="ml-auto h-5 w-5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                How much do you already know?
              </h1>
              <div className="mt-5 space-y-2.5">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLevel(l.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors",
                      level === l.id
                        ? "border-primary bg-primary/8"
                        : "border-border-strong hover:border-primary",
                    )}
                  >
                    <span>
                      <span className="block font-bold">{l.label}</span>
                      <span className="block text-sm text-muted">{l.blurb}</span>
                    </span>
                    {level === l.id && <Check className="h-5 w-5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Why are you learning?
              </h1>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                      goal === g.id
                        ? "border-primary bg-primary/8"
                        : "border-border-strong hover:border-primary",
                    )}
                  >
                    <span className="text-2xl">{g.icon}</span>
                    <span>
                      <span className="block font-bold">{g.label}</span>
                      <span className="block text-xs text-muted">{g.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
              {goal === "custom" && (
                <textarea
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  rows={2}
                  placeholder="Describe your goal…"
                  className="input mt-3 resize-none"
                  autoFocus
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                How much time do you have?
              </h1>
              <p className="mt-1 text-muted">
                We&apos;ll shape your daily session around this.
              </p>
              <div className="mt-5 space-y-2.5">
                {DAILY_MINUTES.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors",
                      minutes === m
                        ? "border-primary bg-primary/8"
                        : "border-border-strong hover:border-primary",
                    )}
                  >
                    <span>
                      <span className="block font-bold">
                        {m === 60 ? "60+ minutes" : `${m} minutes`}
                      </span>
                      <span className="block text-sm text-muted">{PLANS[m]}</span>
                    </span>
                    {minutes === m && <Check className="h-5 w-5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button disabled={!canNext} onClick={submit} size="lg">
            Start Learning <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
