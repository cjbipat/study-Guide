"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, use } from "react";

import { QuizReview } from "@/components/quiz/QuizReview";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/lib/store-context";

function Inner({ id }: { id: string }) {
  const { ready, quiz } = useStore();
  const attemptId = useSearchParams().get("attempt");

  if (!ready) return <PageSkeleton />;

  const latest = quiz.attempts(id).at(-1);
  const view =
    (attemptId && quiz.resultView(attemptId)) ||
    (latest ? quiz.resultView(latest.id) : null);

  if (!view) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <EmptyState
          icon="🤔"
          title="Nothing to review yet"
          body="Take this quiz first."
          action={
            <Button href={`/quizzes/${id}`} size="lg">
              Start quiz
            </Button>
          }
        />
      </div>
    );
  }

  return <QuizReview view={view} />;
}

export default function QuizReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inner id={id} />
    </Suspense>
  );
}
