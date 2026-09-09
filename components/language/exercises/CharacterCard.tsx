"use client";

import { useEffect, useState } from "react";
import { Check, PenLine } from "lucide-react";

import { AudioButton } from "@/components/language/AudioButton";
import { Button } from "@/components/ui/Button";
import { getCharacterDataProvider } from "@/lib/language/characters";
import type { Exercise } from "@/lib/language/exercises";

export function CharacterCard({
  exercise,
  speechLang,
  onDone,
}: {
  exercise: Extract<Exercise, { kind: "character" }>;
  speechLang: string;
  onDone: (known: boolean) => void;
}) {
  const provider = getCharacterDataProvider();
  const data = provider.get(exercise.char);
  const char = exercise.char;
  const [revealed, setRevealed] = useState(false);

  useEffect(() => setRevealed(false), [exercise]);

  if (!revealed) {
    return (
      <div className="flex flex-col items-center text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">
          Learn characters
        </p>
        <div className="mx-auto mt-5 grid h-44 w-44 place-items-center rounded-3xl border border-border bg-surface-2">
          <span className="text-[6.5rem] font-extrabold leading-none">{char}</span>
        </div>
        <p className="mt-4 text-sm text-muted">
          Do you know this character&apos;s reading and meaning?
        </p>
        <Button
          size="lg"
          className="mt-5 w-full max-w-sm"
          onClick={() => setRevealed(true)}
        >
          Reveal reading &amp; meaning
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">
        Learn characters
      </p>

      <div className="mx-auto mt-4 grid h-40 w-40 place-items-center rounded-3xl border border-border bg-surface-2">
        <span className="text-[6rem] font-extrabold leading-none">{char}</span>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <div>
          <p className="text-2xl font-extrabold">
            {data?.pronunciation ?? "—"}
          </p>
          <p className="text-sm text-muted">{data?.meaning ?? "meaning unavailable"}</p>
        </div>
        <AudioButton text={char} lang={speechLang} size="sm" />
      </div>

      {data && data.components.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Components
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {data.components.map((c, i) => (
              <span
                key={i}
                className="rounded-lg border border-border bg-surface-solid px-2.5 py-1 text-sm"
              >
                <span className="text-lg font-bold">{c.char}</span>{" "}
                <span className="text-muted">{c.meaning}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {data && data.exampleWords.length > 0 && (
        <div className="mx-auto mt-5 max-w-sm space-y-1.5 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            Example words
          </p>
          {data.exampleWords.map((w, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5 text-sm"
            >
              <span>
                <span className="font-bold">{w.word}</span>{" "}
                <span className="text-muted">{w.pronunciation}</span>
              </span>
              <span className="text-muted">{w.meaning}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">
        <PenLine className="h-3.5 w-3.5" /> Stroke-order animation is coming soon.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <Button variant="outline" size="lg" onClick={() => onDone(false)}>
          Still learning
        </Button>
        <Button variant="success" size="lg" onClick={() => onDone(true)}>
          <Check className="h-4 w-4" /> I know this
        </Button>
      </div>
    </div>
  );
}
