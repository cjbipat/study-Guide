"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { DECK_ICONS, DECK_THEMES, DECK_THEME_LIST, themeTokens } from "@/lib/deck-theme";
import type { DeckTheme } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface DeckFormValues {
  name: string;
  description: string;
  theme: DeckTheme;
  icon: string;
}

export function DeckForm({
  initial,
  submitLabel = "Create Deck",
  onSubmit,
  onCancel,
}: {
  initial?: Partial<DeckFormValues>;
  submitLabel?: string;
  onSubmit: (values: DeckFormValues) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [theme, setTheme] = useState<DeckTheme>(initial?.theme ?? "violet");
  const [icon, setIcon] = useState(initial?.icon ?? "📚");
  const [touched, setTouched] = useState(false);

  const valid = name.trim().length > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!valid) return;
          onSubmit({ name: name.trim(), description: description.trim(), theme, icon });
        }}
        className="space-y-6"
      >
        <Field label="Deck name" htmlFor="deck-name" required error={touched && !valid ? "Give your deck a name" : undefined}>
          <input
            id="deck-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Organic Chemistry"
            autoFocus
            maxLength={60}
            className="input"
          />
        </Field>

        <Field label="Description" htmlFor="deck-desc" hint="Optional — a line about what's inside.">
          <textarea
            id="deck-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Reactions, mechanisms, and named rules for the midterm."
            rows={3}
            maxLength={240}
            className="input resize-none"
          />
        </Field>

        <Field label="Color theme">
          <div className="flex flex-wrap gap-2.5">
            {DECK_THEME_LIST.map((t) => {
              const tk = DECK_THEMES[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-label={tk.label}
                  aria-pressed={theme === t}
                  className={cn(
                    "h-10 w-10 rounded-2xl bg-gradient-to-br transition-transform",
                    tk.gradient,
                    theme === t
                      ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-surface-solid"
                      : "hover:scale-105",
                  )}
                />
              );
            })}
          </div>
        </Field>

        <Field label="Icon">
          <div className="flex flex-wrap gap-2">
            {DECK_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                aria-label={`Icon ${ic}`}
                aria-pressed={icon === ic}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl border text-lg transition-colors",
                  icon === ic
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-foreground/5",
                )}
              >
                {ic}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex gap-3 pt-2">
          <Button type="submit" size="lg" disabled={!valid}>
            {submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Live preview */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">
          Preview
        </p>
        <motion.div layout>
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border border-border bg-surface-solid p-6 shadow-soft",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-20 blur-2xl",
                themeTokens(theme).gradient,
              )}
            />
            <div
              className={cn(
                "grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-2xl shadow-soft",
                themeTokens(theme).gradient,
              )}
            >
              {icon}
            </div>
            <h3 className="relative mt-4 text-xl font-bold">
              {name.trim() || "Untitled deck"}
            </h3>
            <p className="relative mt-1 text-sm text-muted">
              {description.trim() || "No description yet."}
            </p>
            <p className="relative mt-4 text-xs font-semibold text-muted">
              0 cards · 0% mastery
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold">
        {label}
        {required && <span className="text-accent"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}
