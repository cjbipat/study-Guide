"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, use } from "react";

import { PracticeRunner } from "@/components/language/PracticeRunner";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/lib/store-context";
import { buildExercises } from "@/lib/language/exercises";
import { dailyChallenges } from "@/lib/language/session";
import { MODE_LABEL } from "@/components/language/mode-meta";
import type { PracticeMode } from "@/lib/language/types";

const VALID: PracticeMode[] = [
  "learn",
  "review",
  "listening",
  "speaking",
  "shadowing",
  "reading",
  "writing",
  "characters",
  "tones",
];

function Inner({ id, mode }: { id: string; mode: string }) {
  const { ready, snapshot, lang } = useStore();
  const search = useSearchParams();
  const challengeId = search.get("challenge");

  if (!ready) return <PageSkeleton />;
  const meta = lang.getProfile(id);
  if (!meta || !VALID.includes(mode as PracticeMode)) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <EmptyState
          icon="🤔"
          title="Practice not found"
          body="This practice mode isn't available for this language."
          action={
            <Button href={meta ? `/languages/${id}` : "/languages"} size="lg">
              Go back
            </Button>
          }
        />
      </div>
    );
  }

  const m = mode as PracticeMode;
  const challenge = challengeId
    ? dailyChallenges(meta.profile).find((c) => c.id === challengeId)
    : null;

  const exercises = buildExercises({
    snap: snapshot,
    profile: meta.profile,
    mode: m,
    limit: challenge?.target ?? undefined,
  });

  if (exercises.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <EmptyState
          icon="✅"
          title="Nothing to practise right now"
          body={
            m === "review"
              ? "No words are due for review. Learn some new words first."
              : m === "learn"
                ? "You've learned all the available words. Add your own in Vocabulary."
                : "Add more vocabulary to unlock this practice mode."
          }
          action={
            <Button href={`/languages/${id}`} size="lg">
              Back to {meta.language.name}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <PracticeRunner
      config={{
        profileId: id,
        exercises,
        title: challenge ? challenge.title : MODE_LABEL[m],
        session: false,
        doneHref: `/languages/${id}`,
      }}
    />
  );
}

export default function PracticeModePage({
  params,
}: {
  params: Promise<{ id: string; mode: string }>;
}) {
  const { id, mode } = use(params);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inner id={id} mode={mode} />
    </Suspense>
  );
}
