"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, use } from "react";

import { QuizResults } from "@/components/quiz/QuizResults";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/lib/store-context";

function Inner({ id }: { id: string }) {
  const { ready, quiz } = useStore();
  const attemptId = useSearchParams().get("attempt");

  if (!ready) return <PageSkeleton />;

  const view = attemptId ? quiz.resultView(attemptId) : null;
  // fall back to the latest attempt for this quiz
  const latest = quiz.attempts(id).at(-1);
  const resolved = view ?? (latest ? quiz.resultView(latest.id) : null);

  if (!resolved) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <EmptyState
          icon="🤔"
          title="No results yet"
          body="Take this quiz to see how you did."
          action={
            <Button href={`/quizzes/${id}`} size="lg">
              Start quiz
            </Button>
          }
        />
      </div>
    );
  }

  return <QuizResults view={resolved} />;
}

export default function QuizResultsPage({
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
