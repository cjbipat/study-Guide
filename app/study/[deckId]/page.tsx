"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, use } from "react";

import { StudyView } from "@/components/study/StudyView";

function StudyPageInner({ deckId }: { deckId: string }) {
  const searchParams = useSearchParams();
  const itemId = searchParams.get("item");
  return <StudyView deckId={deckId} itemId={itemId} />;
}

export default function StudyPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = use(params);
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-muted">Loading…</div>}>
      <StudyPageInner deckId={deckId} />
    </Suspense>
  );
}
