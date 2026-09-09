"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpDown, Search, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/navigation/AppShell";
import { MaterialCard } from "@/components/materials/MaterialCard";
import { UploadZone } from "@/components/materials/UploadZone";
import { STATUS_META } from "@/components/materials/status";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/lib/store-context";
import { formatBytes, MAX_LIBRARY_BYTES } from "@/lib/store";
import type { MaterialStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | MaterialStatus;
type Sort = "added" | "studied" | "mastery-desc" | "mastery-asc";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "learning", label: "Learning" },
  { value: "reviewing", label: "Reviewing" },
  { value: "mastered", label: "Mastered" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "added", label: "Recently added" },
  { value: "studied", label: "Recently studied" },
  { value: "mastery-desc", label: "Highest mastery" },
  { value: "mastery-asc", label: "Lowest mastery" },
];

export default function MaterialsPage() {
  const router = useRouter();
  const { materials, ready } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("added");
  const uploadRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = materials.filter((m) => {
      if (filter !== "all" && m.masteryStatus !== filter) return false;
      if (!t) return true;
      return (
        m.name.toLowerCase().includes(t) ||
        (m.deckName ?? "").toLowerCase().includes(t)
      );
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "studied":
          return (
            Date.parse(b.lastStudiedAt ?? "0") - Date.parse(a.lastStudiedAt ?? "0")
          );
        case "mastery-desc":
          return (b.mastery ?? -1) - (a.mastery ?? -1);
        case "mastery-asc":
          return (a.mastery ?? 999) - (b.mastery ?? 999);
        default:
          return Date.parse(b.addedAt) - Date.parse(a.addedAt);
      }
    });
    return list;
  }, [materials, q, filter, sort]);

  const usedBytes = materials.reduce((a, m) => a + m.size, 0);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: materials.length,
      new: 0,
      learning: 0,
      reviewing: 0,
      mastered: 0,
    };
    materials.forEach((m) => (c[m.masteryStatus] += 1));
    return c;
  }, [materials]);

  if (!ready) return <PageSkeleton />;

  if (materials.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-4xl shadow-glow"
          >
            📚
          </motion.div>
          <h1 className="mt-6 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your learning starts here
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Upload notes, documents, or study materials and turn them into
            powerful learning tools — flashcards, quizzes, study guides, and quick
            reviews.
          </p>
          <div className="mt-8">
            <UploadZone
              variant="hero"
              onUploaded={(m) => {
                if (m.length === 1) router.push(`/materials/${m[0].id}`);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <PageHeader
        title="Your study materials"
        subtitle="Everything you upload. Everything you learn."
        action={
          <Button
            size="lg"
            onClick={() =>
              uploadRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }
          >
            <Upload className="h-4 w-4" /> Upload Material
          </Button>
        }
      />

      <div ref={uploadRef}>
        <UploadZone
          variant="compact"
          onUploaded={(m) => {
            if (m.length === 1) router.push(`/materials/${m[0].id}`);
          }}
        />
      </div>

      {/* Command center controls */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                filter === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border-strong bg-surface-solid text-muted hover:text-foreground",
              )}
            >
              {f.value !== "all" && (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    STATUS_META[f.value as MaterialStatus].dot,
                  )}
                />
              )}
              {f.label}
              <span className="text-xs text-muted-2">{counts[f.value]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-solid px-4 py-2.5 shadow-soft focus-within:border-primary sm:w-72">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search materials"
              aria-label="Search materials"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-xl border border-border bg-surface-solid px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
              aria-label="Sort materials"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs font-semibold text-muted">
          {materials.length} material{materials.length === 1 ? "" : "s"} ·{" "}
          {formatBytes(usedBytes)} / {formatBytes(MAX_LIBRARY_BYTES)} used
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">
          No materials match your filters.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m, i) => (
            <MaterialCard key={m.id} material={m} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
