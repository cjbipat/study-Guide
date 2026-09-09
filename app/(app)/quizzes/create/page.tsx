"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/navigation/AppShell";
import { SourcePicker } from "@/components/quiz/SourcePicker";
import { QuizWizard } from "@/components/quiz/QuizWizard";
import { QuizBuilder } from "@/components/quiz/QuizBuilder";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { StudyMaterialService } from "@/lib/materials/processor";
import { useStore } from "@/lib/store-context";
import type { DeckWithMeta, MaterialWithMeta } from "@/lib/types";
import type { LanguageProfileWithMeta } from "@/lib/language/store";
import type { QuizSource, QuizSourceType } from "@/lib/quiz/types";

function CreateInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, snapshot, decks, materials, lang } = useStore();

  if (!ready) return <PageSkeleton />;

  const editId = params.get("edit");
  const sourceType = params.get("source") as QuizSourceType | null;
  const sourceId = params.get("id");
  const presetTitle = params.get("title") ?? "";

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      {children}
    </div>
  );

  // ---- editing an existing quiz ----
  if (editId) {
    const q = snapshot.quizzes.find((x) => x.id === editId);
    if (!q) return shell(<NotFound router={router} />);
    return shell(<QuizBuilder initial={q} />);
  }

  // ---- no source picked yet ----
  if (!sourceType) {
    return shell(
      <>
        <BackLink onClick={() => router.push("/quizzes")} label="Quizzes" />
        <PageHeader title="Create a quiz" subtitle="One quiz engine, any source." />
        <SourcePicker onPick={(t) => router.push(`/quizzes/create?source=${t}`)} />
      </>,
    );
  }

  // ---- manual ----
  if (sourceType === "manual") {
    return shell(<QuizBuilder defaultTitle={presetTitle} />);
  }

  // ---- source chosen, now pick which one ----
  if (!sourceId) {
    const list = pickables(sourceType, { decks, materials, langProfiles: lang.profiles });
    return shell(
      <>
        <BackLink
          onClick={() => router.push("/quizzes/create")}
          label="Change source"
        />
        <PageHeader
          title={
            sourceType === "material"
              ? "Pick a study material"
              : sourceType === "deck"
                ? "Pick a flashcard deck"
                : "Pick a language"
          }
        />
        {list.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted">
            {sourceType === "material"
              ? "Upload a study material first."
              : sourceType === "deck"
                ? "Create a deck first."
                : "Start learning a language first."}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {list.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() =>
                    router.push(
                      `/quizzes/create?source=${sourceType}&id=${item.id}`,
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface-solid p-4 text-left shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span>
                      <span className="block font-bold">{item.label}</span>
                      {item.sub && (
                        <span className="block text-xs text-muted">{item.sub}</span>
                      )}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </>,
    );
  }

  // ---- the wizard ----
  const source = resolveSource(sourceType, sourceId, {
    decks,
    materials,
    langProfiles: lang.profiles,
  });
  if (!source) return shell(<NotFound router={router} />);

  return shell(<QuizWizard source={source} />);
}

export default function CreateQuizPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CreateInner />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */

interface Ctx {
  decks: DeckWithMeta[];
  materials: MaterialWithMeta[];
  langProfiles: LanguageProfileWithMeta[];
}

function pickables(type: QuizSourceType, ctx: Ctx) {
  if (type === "material")
    return ctx.materials.map((m) => ({
      id: m.id,
      label: m.name.replace(/\.[^.]+$/, ""),
      icon: "📄",
      sub: StudyMaterialService.canGenerate(m)
        ? "Ready"
        : "Text not extracted — manual questions only",
    }));
  if (type === "deck")
    return ctx.decks.map((d) => ({
      id: d.id,
      label: d.name,
      icon: d.icon,
      sub: `${d.cardCount} card${d.cardCount === 1 ? "" : "s"}`,
    }));
  return ctx.langProfiles.map((p) => ({
    id: p.profile.id,
    label: p.language.name,
    icon: p.language.flag,
    sub: `${p.progress.vocabTotal} words`,
  }));
}

function resolveSource(
  type: QuizSourceType,
  id: string,
  ctx: Ctx,
): QuizSource | null {
  if (type === "material") {
    const m = ctx.materials.find((x) => x.id === id);
    return m
      ? { type, id, label: m.name.replace(/\.[^.]+$/, ""), icon: "📄" }
      : null;
  }
  if (type === "deck") {
    const d = ctx.decks.find((x) => x.id === id);
    return d ? { type, id, label: d.name, icon: d.icon } : null;
  }
  const p = ctx.langProfiles.find((x) => x.profile.id === id);
  return p
    ? { type, id, label: p.language.name, icon: p.language.flag, languageMode: "vocabulary" }
    : null;
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}

function NotFound({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="text-center">
      <p className="text-muted">That source could not be found.</p>
      <Button className="mt-4" onClick={() => router.push("/quizzes/create")}>
        Start over
      </Button>
    </div>
  );
}
