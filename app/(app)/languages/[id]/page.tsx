"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookMarked, Sparkles, Trash2 } from "lucide-react";
import { use, useState } from "react";

import { PageHeader } from "@/components/navigation/AppShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { SkillBars } from "@/components/language/SkillBars";
import { TodaySessionCard } from "@/components/language/TodaySessionCard";
import { ConversationsSection } from "@/components/language/ConversationsSection";
import { AudioSettingsPanel } from "@/components/language/AudioSettingsPanel";
import { ContinueLearningCard } from "@/components/materials/ContinueLearningCard";
import { MODE_BLURB, MODE_ICON, MODE_LABEL } from "@/components/language/mode-meta";
import { useStore } from "@/lib/store-context";
import { getLanguage, GOALS } from "@/lib/language/catalog";
import { buildSessionPlan, dailyChallenges } from "@/lib/language/session";
import type { PracticeMode, RomanizationMode } from "@/lib/language/types";
import { cn, formatRelativeTime } from "@/lib/utils";

const CORE_MODES: PracticeMode[] = [
  "learn",
  "review",
  "listening",
  "shadowing",
  "speaking",
  "reading",
  "writing",
];

export default function LanguageDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { ready, snapshot, lang } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!ready) return <PageSkeleton />;

  const meta = lang.getProfile(id);
  if (!meta) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon="🤔"
          title="Language not found"
          body="This language may have been removed."
          action={
            <Button href="/languages" size="lg">
              Back to languages
            </Button>
          }
        />
      </div>
    );
  }

  const { profile, language, progress } = meta;
  const sampleWord = lang.vocab(id)[0]?.target;
  const recommendation = lang.recommendation(id)!;
  const plan = buildSessionPlan(snapshot, profile);
  const activities = lang.activities(id);
  const challenges = dailyChallenges(profile);
  const goalMeta = GOALS.find((g) => g.id === profile.goal);

  const hasConversations = lang.conversation.scenarios(id).length > 0;
  const modes: PracticeMode[] = [
    ...CORE_MODES,
    ...(hasConversations ? (["conversation"] as PracticeMode[]) : []),
    ...(language.characterBased ? (["characters"] as PracticeMode[]) : []),
    ...(language.tonal ? (["tones"] as PracticeMode[]) : []),
  ];

  const recAsStudyRec = {
    kind: "open-material" as const,
    label: recommendation.cta,
    reason: recommendation.body,
    href: recommendation.href,
    tone: (recommendation.kind === "practice-tones" ||
    recommendation.kind === "welcome-back" ||
    recommendation.kind === "practice-conversation" ||
    recommendation.kind === "travel-conversation"
      ? "accent"
      : "primary") as "primary" | "accent" | "success",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <Link
        href="/languages"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> My languages
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="text-4xl">{language.flag}</span> {language.name}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="capitalize">{profile.level.replace("-", " ")}</span>
            <span aria-hidden>·</span>
            <span>
              {goalMeta?.icon} {profile.customGoal || goalMeta?.label}
            </span>
            <span aria-hidden>·</span>
            <span>{profile.dailyMinutes} min/day</span>
          </span>
        }
        action={
          <Button
            href={`/languages/${id}/vocab`}
            variant="outline"
            size="lg"
          >
            <BookMarked className="h-4 w-4" /> Vocabulary ({progress.vocabTotal})
          </Button>
        }
      />

      <TodaySessionCard profileId={id} plan={plan} streak={profile.streak} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <ContinueLearningCard
          recommendation={recAsStudyRec}
          heading="Recommended right now"
        />
        <div className="rounded-3xl border border-border bg-surface-solid p-6 shadow-soft">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
            {language.name} progress
          </h2>
          <div className="mt-4">
            <SkillBars progress={progress} />
          </div>
        </div>
      </div>

      {/* Practice modes */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-extrabold tracking-tight">Practice</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode) => (
            <Link
              key={mode}
              href={`/languages/${id}/practice/${mode}`}
              className="group flex flex-col rounded-2xl border border-border bg-surface-solid p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <span className="text-2xl">{MODE_ICON[mode]}</span>
              <span className="mt-2 font-bold">{MODE_LABEL[mode]}</span>
              <span className="mt-0.5 text-xs text-muted">{MODE_BLURB[mode]}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-1.5">
                Practise <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
          {(() => {
            const langQuiz = snapshot.quizzes.find(
              (q) => q.source.type === "language" && q.source.id === id,
            );
            return (
              <Link
                href={
                  langQuiz
                    ? `/quizzes/${langQuiz.id}`
                    : `/quizzes/create?source=language&id=${id}`
                }
                className="group flex flex-col rounded-2xl border border-border bg-surface-solid p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                <span className="text-2xl">📝</span>
                <span className="mt-2 font-bold">Quiz</span>
                <span className="mt-0.5 text-xs text-muted">
                  Test vocabulary, listening, and sentences.
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-1.5">
                  {langQuiz ? "Take quiz" : "Create quiz"}{" "}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })()}
        </div>
      </section>

      {/* Conversations */}
      <ConversationsSection profileId={id} />

      {/* Challenges */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-extrabold tracking-tight">
          Daily challenges
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {challenges.map((c) => (
            <Link
              key={c.id}
              href={`/languages/${id}/practice/${c.mode}?challenge=${c.id}`}
              className="rounded-2xl border border-border bg-surface-solid p-4 shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <p className="font-bold">{c.title}</p>
              <p className="mt-0.5 text-xs text-muted">{c.description}</p>
              <p className="mt-2 text-xs font-bold text-accent">+{c.xp} XP</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Activity + settings */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="mb-4 text-xl font-extrabold tracking-tight">
            Recent activity
          </h2>
          {activities.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
              Complete a session to start tracking your progress.
            </p>
          ) : (
            <ul className="space-y-2">
              {activities.slice(0, 6).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface-solid p-3"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {a.type === "session-completed"
                        ? "Completed a session"
                        : a.type === "language-added"
                          ? "Started this language"
                          : a.type === "vocab-added"
                            ? "Added a word"
                            : a.type === "challenge-completed"
                              ? "Completed a challenge"
                              : a.type === "conversation-completed"
                                ? "💬 Completed a conversation"
                                : "Activity"}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {a.type === "session-completed" && a.accuracy != null
                        ? `${a.reviewed} items · ${a.accuracy}% · +${a.xpEarned} XP`
                        : (a.detail ?? "")}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-2">
                    {formatRelativeTime(a.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-extrabold tracking-tight">Settings</h2>
          <div className="space-y-4 rounded-3xl border border-border bg-surface-solid p-5 shadow-soft">
            <AudioSettingsPanel
              speechLang={language.speechLang}
              sampleText={sampleWord ?? language.nativeName}
            />
            <div className="border-t border-border pt-3" />
            {language.romanization && (
              <div>
                <p className="text-sm font-bold">
                  {language.romanization === "pinyin"
                    ? "Pinyin"
                    : language.romanization === "romaji"
                      ? "Romaji"
                      : "Romanisation"}{" "}
                  visibility
                </p>
                <p className="text-xs text-muted">
                  Advanced learners shouldn&apos;t stay dependent on it.
                </p>
                <div className="mt-2 flex gap-1.5">
                  {(
                    [
                      ["always", "Always"],
                      ["tap", "On tap"],
                      ["hidden", "Hide"],
                    ] as [RomanizationMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => lang.setRomanizationMode(id, mode)}
                      className={cn(
                        "flex-1 rounded-xl border px-2 py-1.5 text-xs font-semibold transition-colors",
                        profile.romanizationMode === mode
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border-strong text-muted hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-border pt-3">
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
              >
                <Trash2 className="h-4 w-4" /> Remove this language
              </button>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        labelledBy="lang-del"
      >
        <h3 id="lang-del" className="text-xl font-extrabold">
          Remove {language.name}?
        </h3>
        <p className="mt-2 text-muted">
          Your vocabulary, streak, and progress for this language will be deleted.
          This can&apos;t be undone.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            onClick={() => {
              lang.deleteProfile(id);
              router.push("/languages");
            }}
          >
            Remove language
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
