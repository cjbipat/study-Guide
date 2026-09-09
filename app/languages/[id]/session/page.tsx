"use client";

import { use } from "react";

import { PracticeRunner } from "@/components/language/PracticeRunner";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store-context";
import { buildSessionPlan } from "@/lib/language/session";
import { buildExercises } from "@/lib/language/exercises";
import type { Exercise } from "@/lib/language/exercises";

export default function LanguageSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { ready, snapshot, lang } = useStore();

  if (!ready) return <PageSkeleton />;
  const meta = lang.getProfile(id);
  if (!meta) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Button href="/languages">Back to languages</Button>
      </div>
    );
  }

  const { profile } = meta;
  const plan = buildSessionPlan(snapshot, profile);

  // Build the full exercise list from the plan's blocks, in order.
  const exercises: Exercise[] = [];
  for (const block of plan.blocks) {
    exercises.push(
      ...buildExercises({
        snap: snapshot,
        profile,
        mode: block.mode,
        limit: block.itemCount,
      }),
    );
  }

  const hasConversationBlock = plan.blocks.some((b) => b.mode === "conversation");

  return (
    <PracticeRunner
      config={{
        profileId: id,
        exercises,
        title: "Today's session",
        session: true,
        sessionBlocks: plan.blocks.map((b) => b.mode),
        doneHref: hasConversationBlock
          ? `/languages/${id}/practice/conversation`
          : `/languages/${id}`,
      }}
    />
  );
}
