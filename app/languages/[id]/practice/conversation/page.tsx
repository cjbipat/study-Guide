"use client";

import { Suspense, use } from "react";

import { ConversationExperience } from "@/components/language/conversation/ConversationExperience";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function ConversationPracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConversationExperience profileId={id} />
    </Suspense>
  );
}
