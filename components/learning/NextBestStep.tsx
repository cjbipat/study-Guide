import {
  ArrowRight,
  Clock,
  RefreshCw,
  BookOpen,
  ClipboardCheck,
  Languages,
  MessageCircle,
  Sparkles,
  Target,
  Rocket,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { LearningRecommendation, RecommendationType } from "@/lib/learning/types";

const ICON: Record<RecommendationType, typeof ArrowRight> = {
  ReviewFlashcards: RefreshCw,
  StudyMaterial: BookOpen,
  TakeQuiz: ClipboardCheck,
  ReviewQuizMistakes: Target,
  RetakeQuiz: ClipboardCheck,
  PracticeLanguage: Languages,
  ContinueLanguageSession: Languages,
  ContinueConversation: MessageCircle,
  LearnVocabulary: Sparkles,
  GetStarted: Rocket,
};

export function NextBestStep({
  recommendation,
  onSkip,
}: {
  recommendation: LearningRecommendation;
  onSkip?: () => void;
}) {
  const Icon = ICON[recommendation.type] ?? ArrowRight;

  return (
    <section aria-labelledby="next-step-heading" className="mt-2">
      <h2
        id="next-step-heading"
        className="mb-3 text-sm font-bold uppercase tracking-widest text-muted"
      >
        Your next best step
      </h2>

      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface-solid to-surface-solid p-6 shadow-glow sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="h-7 w-7" aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {recommendation.title}
            </h3>
            <p className="mt-2 text-base text-muted">{recommendation.reason.text}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button href={recommendation.action.href} size="lg">
                {recommendation.action.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
              {recommendation.estimatedMinutes != null && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
                  <Clock className="h-4 w-4" aria-hidden />
                  ~{recommendation.estimatedMinutes} min
                </span>
              )}
              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-sm font-semibold text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  Show me something else
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
