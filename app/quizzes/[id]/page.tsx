"use client";

import { use } from "react";

import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/lib/store-context";

export default function QuizPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { ready, quiz } = useStore();

  if (!ready) return <PageSkeleton />;
  const q = quiz.get(id);

  if (!q || q.questions.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <EmptyState
          icon="🤔"
          title={q ? "This quiz has no questions yet" : "Quiz not found"}
          body={
            q
              ? "Add questions in the builder before starting."
              : "This quiz may have been removed."
          }
          action={
            <Button href="/quizzes" size="lg">
              Back to quizzes
            </Button>
          }
        />
      </div>
    );
  }

  return <QuizPlayer quiz={q} />;
}
