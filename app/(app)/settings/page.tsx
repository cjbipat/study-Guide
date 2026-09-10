"use client";

import { Check, Download, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";

import { useFireworks } from "@/components/fireworks/fireworks-context";
import { PageHeader } from "@/components/navigation/AppShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useStore } from "@/lib/store-context";

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { snapshot, resetAll, exportJSON } = useStore();
  const { celebrate } = useFireworks();
  const reduced = useReducedMotion();
  const [name, setName] = useState(snapshot.user.name);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  function download() {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ember-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <PageHeader title="Settings" subtitle="Preferences, appearance, and your data." />

      <section className="rounded-3xl border border-border bg-surface-solid px-6 shadow-soft">
        <div className="divide-y divide-border">
          <Row title="Display name" desc="Shown in your dashboard greeting.">
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                className="input w-44"
                aria-label="Display name"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Name is a UI-only preference here; the store user is mock.
                  window.localStorage.setItem("studyquest.name", name.trim());
                  setSaved(true);
                }}
              >
                {saved ? <Check className="h-4 w-4" /> : "Save"}
              </Button>
            </div>
          </Row>

          <Row title="Theme" desc="Light, dark, or match your system.">
            <ThemeToggle />
          </Row>

          <Row
            title="Motion"
            desc={
              reduced
                ? "Reduced motion is on — fireworks are replaced with a calm success pulse."
                : "Full animations are on. Turn on reduced motion in your OS to calm them down."
            }
          >
            <span className="rounded-full bg-foreground/6 px-3 py-1 text-xs font-semibold text-muted">
              {reduced ? "Reduced" : "Full"}
            </span>
          </Row>

          <Row title="Test the celebration" desc="Fire the confetti engine on demand.">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => celebrate({ intensity: "high", durationMs: 2000 })}
            >
              <Sparkles className="h-4 w-4" /> Launch fireworks
            </Button>
          </Row>
        </div>
      </section>

      <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-widest text-muted">
        Data
      </h2>
      <section className="rounded-3xl border border-border bg-surface-solid px-6 shadow-soft">
        <div className="divide-y divide-border">
          <Row
            title="Export your data"
            desc="Download decks, cards, and stats as JSON."
          >
            <Button size="sm" variant="outline" onClick={download}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </Row>
          <Row
            title="Clear all my data"
            desc="Permanently delete every deck, material, quiz, language, and all your progress. Starts you over with an empty workspace. Can't be undone."
          >
            <Button
              size="sm"
              variant="ghost"
              className="text-accent hover:bg-accent/10"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw className="h-4 w-4" /> Clear
            </Button>
          </Row>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted-2">
        Ember stores your workspace in this browser only — it is not synced to an
        account or across devices yet. Export regularly to keep a backup. The
        storage layer is built to move to authenticated cloud sync without
        changing any features.
      </p>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        labelledBy="reset-title"
      >
        <h2 id="reset-title" className="text-xl font-extrabold">
          Clear all your data?
        </h2>
        <p className="mt-2 text-muted">
          Every deck, material, quiz, language, review, and all your XP, streak,
          and history will be permanently deleted. You&apos;ll start with a clean,
          empty workspace. This can&apos;t be undone — export a backup first if
          you want one.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            onClick={() => {
              resetAll();
              setConfirmReset(false);
            }}
          >
            Clear everything
          </Button>
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
