"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Target } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useFireworks } from "@/components/fireworks/fireworks-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ScenarioLibrary } from "@/components/language/conversation/ScenarioLibrary";
import {
  ConversationChat,
  type ConversationResult,
} from "@/components/language/conversation/ConversationChat";
import { ConversationComplete } from "@/components/language/conversation/ConversationComplete";
import { useStore } from "@/lib/store-context";
import { getLanguage } from "@/lib/language/catalog";
import {
  conversationMilestoneCelebration,
  type FinishConversationOutcome,
} from "@/lib/language/conversation-store";
import type { ConversationVocabulary } from "@/lib/language/conversation-types";

type Phase = "library" | "setup" | "chat" | "complete";

export function ConversationExperience({ profileId }: { profileId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const { ready, lang, conversation } = useStore();
  const { celebrate } = useFireworks();

  const [phase, setPhase] = useState<Phase>("library");
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [result, setResult] = useState<ConversationResult | null>(null);
  const [outcome, setOutcome] = useState<FinishConversationOutcome | null>(null);

  const meta = ready ? lang.getProfile(profileId) : undefined;
  const language = meta ? getLanguage(meta.profile.languageId) : undefined;
  const dashHref = `/languages/${profileId}`;

  const views = useMemo(
    () => (ready ? conversation.scenarios(profileId) : []),
    [ready, conversation, profileId],
  );
  const progress = useMemo(
    () =>
      ready
        ? conversation.progress(profileId)
        : {
            totalSessions: 0,
            scenariosCompleted: 0,
            completedScenarioIds: [],
            wordsUsed: 0,
            wordsAdded: 0,
            streakDays: 0,
            byCategory: {},
          },
    [ready, conversation, profileId],
  );

  // deep link ?s=<scenarioId>
  useEffect(() => {
    const s = search.get("s");
    if (s && phase === "library") {
      const v = views.find((x) => x.scenario.id === s);
      if (v && v.status !== "locked") {
        setScenarioId(s);
        setPhase("setup");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views]);

  const activeView = scenarioId
    ? views.find((v) => v.scenario.id === scenarioId)
    : undefined;

  const onAddWord = useCallback(
    (w: ConversationVocabulary) =>
      conversation.addVocab(
        profileId,
        {
          target: w.target,
          translation: w.translation,
          pronunciation: w.pronunciation,
        },
        scenarioId ?? "",
      ),
    [conversation, profileId, scenarioId],
  );

  const handleChatComplete = useCallback(
    (r: ConversationResult) => {
      const o = conversation.finish({
        profileId,
        scenarioId: r.scenarioId,
        startedAt: r.startedAt,
        turnsCompleted: r.turnsCompleted,
        modesUsed: r.modesUsed,
        vocabEncountered: r.vocabEncountered,
        vocabAdded: r.vocabAdded,
        appropriateChoices: r.appropriateChoices,
        gradedChoices: r.gradedChoices,
      });
      setResult(r);
      setOutcome(o);
      setPhase("complete");
      if (o.milestone) {
        celebrate(conversationMilestoneCelebration(o.milestone));
      }
    },
    [conversation, profileId, celebrate],
  );

  if (!ready) return <PageSkeleton />;
  if (!meta || !language) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
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

  const { profile } = meta;

  if (phase === "library") {
    return (
      <ScenarioLibrary
        languageName={language.name}
        views={views}
        progress={progress}
        onPick={(id) => {
          setScenarioId(id);
          setPhase("setup");
        }}
        onExit={() => router.push(dashHref)}
      />
    );
  }

  if (phase === "setup" && activeView) {
    const sc = activeView.scenario;
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <button
          onClick={() => {
            setScenarioId(null);
            setPhase("library");
          }}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All scenarios
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-border bg-surface-solid p-7 shadow-soft"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Let&apos;s practice
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-extrabold tracking-tight">
            <span className="text-3xl">{sc.icon}</span> {sc.title}
          </h1>

          <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm text-muted">
            {sc.context}
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <Row icon={<Target className="h-4 w-4" />} label="Your goal">
              {sc.goal}
            </Row>
            <Row label="Skills practiced">
              <span className="flex flex-wrap gap-1.5">
                {sc.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"
                  >
                    {s}
                  </span>
                ))}
              </span>
            </Row>
            <Row icon={<Clock className="h-4 w-4" />} label="Estimated time">
              {sc.estimatedMinutes} minutes
            </Row>
          </div>

          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => setPhase("chat")}
          >
            Start Conversation
          </Button>
        </motion.div>
      </div>
    );
  }

  if (phase === "chat" && activeView) {
    return (
      <ConversationChat
        scenario={activeView.scenario}
        profileId={profileId}
        speechLang={language.speechLang}
        romanizationMode={profile.romanizationMode}
        level={profile.level}
        languageFlag={language.flag}
        onExit={() => {
          setPhase("library");
          setScenarioId(null);
        }}
        onComplete={handleChatComplete}
      />
    );
  }

  if (phase === "complete" && activeView && result && outcome) {
    return (
      <ConversationComplete
        scenario={activeView.scenario}
        languageName={language.name}
        result={result}
        outcome={outcome}
        speechLang={language.speechLang}
        showRom={profile.romanizationMode !== "hidden"}
        alreadyInVocab={
          new Set(lang.vocab(profileId).map((v) => v.target))
        }
        onAddWord={onAddWord}
        doneHref={dashHref}
        onDone={() => {}}
      />
    );
  }

  // fallback
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Button href={dashHref} size="lg">
        Back to {language.name}
      </Button>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <div>
        <p className="font-bold">{label}</p>
        <div className="text-muted">{children}</div>
      </div>
    </div>
  );
}
