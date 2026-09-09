"use client";

import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

import { StudyGuideView } from "@/components/learn/StudyGuideView";
import { SummaryView } from "@/components/learn/SummaryView";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/lib/store-context";

export default function LearnItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = use(params);
  const router = useRouter();
  const { ready, getLearningItem } = useStore();
  const item = ready ? getLearningItem(itemId) : undefined;

  useEffect(() => {
    if (ready && item?.type === "flashcards") {
      router.replace(
        item.deckId
          ? `/study/${item.deckId}?item=${item.id}`
          : `/materials/${item.materialId}`,
      );
    }
    // Quizzes now live in the universal Quiz system.
    if (ready && item?.type === "quiz") router.replace("/quizzes");
  }, [ready, item, router]);

  if (!ready) return <PageSkeleton />;

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon="🤔"
          title="Not found"
          body="This learning item may have been removed."
          action={
            <Button href="/materials" size="lg">
              Back to materials
            </Button>
          }
        />
      </div>
    );
  }

  if (item.type === "quiz") return <PageSkeleton />;
  if (item.type === "study-guide") return <StudyGuideView item={item} />;
  if (item.type === "summary") return <SummaryView item={item} />;
  return <PageSkeleton />;
}
