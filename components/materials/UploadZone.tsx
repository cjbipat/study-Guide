"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, FileUp, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store-context";
import { processingDelay } from "@/lib/materials/processor";
import {
  ACCEPTED_FILES,
  fileToMaterialInput,
} from "@/lib/materials/file-utils";
import { MAX_MATERIAL_BYTES, formatBytes } from "@/lib/store";
import type { StudyMaterial } from "@/lib/types";
import { cn } from "@/lib/utils";

type Phase = "idle" | "uploading" | "processing" | "done";

const FORMAT_PILLS = ["PDF", "TXT", "MD", "CSV", "Images"];

export function UploadZone({
  deckId = null,
  variant = "hero",
  onUploaded,
  className,
}: {
  deckId?: string | null;
  variant?: "hero" | "compact";
  onUploaded?: (materials: StudyMaterial[]) => void;
  className?: string;
}) {
  const { addMaterial } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<StudyMaterial[]>([]);
  const [currentName, setCurrentName] = useState("");

  async function ingest(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setError(null);
    setPhase("uploading");
    const added: StudyMaterial[] = [];

    for (const file of files) {
      setCurrentName(file.name);
      if (file.size > MAX_MATERIAL_BYTES) {
        setError(
          `"${file.name}" is ${formatBytes(file.size)} — files must be under ${formatBytes(
            MAX_MATERIAL_BYTES,
          )}.`,
        );
        continue;
      }
      try {
        const input = await fileToMaterialInput(file, deckId);
        setPhase("processing");
        // Real work already done (decode + text extract); brief beat so the
        // "Preparing your study material…" state is visible.
        await processingDelay(650);
        const res = addMaterial(input);
        if (res.ok) added.push(res.material);
        else setError(res.error);
      } catch {
        setError(`Couldn't read "${file.name}".`);
      }
    }

    if (added.length) {
      setJustAdded(added);
      setPhase("done");
      onUploaded?.(added);
    } else {
      setPhase("idle");
    }
  }

  function reset() {
    setPhase("idle");
    setJustAdded([]);
    setError(null);
  }

  const busy = phase === "uploading" || phase === "processing";

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILES}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) ingest(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy && e.dataTransfer.files?.length) ingest(e.dataTransfer.files);
        }}
        className={cn(
          "relative overflow-hidden rounded-3xl border-2 border-dashed transition-colors",
          variant === "hero" ? "p-10 sm:p-14" : "p-6",
          dragging
            ? "border-primary bg-primary/8"
            : "border-border-strong bg-surface-solid",
        )}
      >
        <AnimatePresence mode="wait">
          {phase === "done" ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0.3, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 14 }}
                className="grid h-16 w-16 place-items-center rounded-2xl bg-success/15 text-success-strong dark:text-success"
              >
                <Check className="h-8 w-8" />
              </motion.div>
              <p className="mt-4 text-xl font-extrabold">
                {justAdded.length > 1
                  ? `${justAdded.length} materials added`
                  : "Material added"}
              </p>
              <p className="mt-1 text-sm text-muted">
                Ready to turn {justAdded.length > 1 ? "these" : "this"} into
                something useful?
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <Button size="sm" variant="outline" onClick={reset}>
                  <UploadCloud className="h-4 w-4" /> Upload more
                </Button>
              </div>
            </motion.div>
          ) : busy ? (
            <motion.div
              key="busy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-bold">
                {phase === "uploading"
                  ? "Uploading…"
                  : "Preparing your study material…"}
              </p>
              <p className="mt-1 max-w-xs truncate text-sm text-muted">
                {currentName}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <div
                className={cn(
                  "grid place-items-center rounded-2xl bg-primary/12 text-primary",
                  variant === "hero" ? "h-16 w-16" : "h-12 w-12",
                )}
              >
                <FileUp className={variant === "hero" ? "h-8 w-8" : "h-6 w-6"} />
              </div>
              <p
                className={cn(
                  "mt-4 font-extrabold",
                  variant === "hero" ? "text-xl" : "text-base",
                )}
              >
                Drop your study material here
              </p>
              <p className="mt-1 text-sm text-muted">or</p>
              <Button
                size={variant === "hero" ? "md" : "sm"}
                className="mt-2"
                onClick={() => inputRef.current?.click()}
              >
                Browse Files
              </Button>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
                {FORMAT_PILLS.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-foreground/6 px-2.5 py-1 text-[11px] font-bold text-muted"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-start gap-2 rounded-xl bg-accent/10 px-3 py-2 text-sm font-semibold text-accent"
          >
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "done" && justAdded.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Scroll down to choose what to create
        </motion.p>
      )}
    </div>
  );
}
