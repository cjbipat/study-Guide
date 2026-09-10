"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as db from "@/lib/store";
import { emptySnapshot } from "@/lib/storage/empty";
import type {
  AchievementId,
  Card,
  DatabaseSnapshot,
  DeckWithMeta,
  LearningActivity,
  LearningItem,
  MaterialGoalType,
  MaterialProgress,
  MaterialWithMeta,
  ReviewRating,
  StudyMaterial,
  StudyRecommendation,
  StudySession,
} from "@/lib/types";
import { globalLearning, type GlobalLearning } from "@/lib/materials/progress";
import {
  getGlobalRecommendation,
  type GlobalRecommendation,
} from "@/lib/materials/recommendation";
import * as langdb from "@/lib/language/store";
import * as convdb from "@/lib/language/conversation-store";
import type {
  LanguageActivity,
  LanguageProgress,
  LanguageRecommendation,
  LanguageVocabularyItem,
} from "@/lib/language/types";
import type {
  ConversationProgress,
  ConversationScenario,
  ConversationScenarioView,
  ConversationSession,
} from "@/lib/language/conversation-types";
import { scenarioById } from "@/lib/language/conversation-content";
import * as quizdb from "@/lib/quiz/store";
import { generateQuizQuestions, regenerateQuiz } from "@/lib/quiz/generators";
import {
  getNextBestAction,
  buildRecommendations,
} from "@/lib/learning/recommendations";
import { detectWeaknesses } from "@/lib/learning/weaknesses";
import { buildDailyLearningPlan } from "@/lib/learning/session-planner";
import { getLearningAreas, activeSources } from "@/lib/learning/progress";
import { masterySignalFor } from "@/lib/learning/mastery";
import { recentProgress, unifiedActivity } from "@/lib/learning/activity";
import type {
  DailyPlan,
  LearningAreaProgress,
  LearningRecommendation,
  LearningSource,
  LearningSourceType,
  LearningWeakness,
  MasterySignal,
  UnifiedActivity,
} from "@/lib/learning/types";
import type {
  Quiz,
  QuizAttempt,
  QuizGenerationResult,
  QuizQuestion,
  QuizRecipe,
  QuizResultView,
  QuizSource,
  QuizWithMeta,
} from "@/lib/quiz/types";

interface StoreContextValue {
  ready: boolean;
  snapshot: DatabaseSnapshot;

  // selectors
  decks: DeckWithMeta[];
  getDeck: (id: string) => DeckWithMeta | undefined;
  getCards: (deckId: string) => Card[];
  buildQueue: (
    deckId: string,
    opts?: { onlyCardIds?: string[] },
  ) => Card[];

  // deck actions
  createDeck: (input: db.DeckInput) => string;
  updateDeck: (id: string, patch: Partial<db.DeckInput>) => void;
  deleteDeck: (id: string) => void;

  // card actions
  createCard: (deckId: string, input: db.CardInput) => Card;
  updateCard: (id: string, patch: Partial<db.CardInput>) => void;
  deleteCard: (id: string) => void;

  // study materials
  materials: MaterialWithMeta[];
  getMaterial: (id: string) => MaterialWithMeta | undefined;
  materialsForDeck: (deckId: string) => MaterialWithMeta[];
  addMaterial: (input: db.MaterialInput) => db.AddMaterialResult;
  deleteMaterial: (id: string) => void;
  renameMaterial: (id: string, name: string) => void;
  setMaterialDeck: (id: string, deckId: string | null) => void;

  // learning items
  learningItemsForMaterial: (materialId: string) => LearningItem[];
  learningItemsForDeck: (deckId: string) => LearningItem[];
  getLearningItem: (id: string) => LearningItem | undefined;
  createFlashcardsFromMaterial: (
    args: Parameters<typeof db.createFlashcardsFromMaterial>[1],
  ) => ReturnType<typeof db.createFlashcardsFromMaterial>;
  addLearningItem: (
    args: Parameters<typeof db.addLearningItem>[1],
  ) => LearningItem;
  deleteLearningItem: (id: string, opts?: { alsoDeleteCards?: boolean }) => void;
  recordQuizResult: (args: {
    itemId: string;
    correct: number;
    total: number;
  }) => db.QuizOutcome;

  // learning hub — progress, activity, recommendations, goals
  getMaterialProgress: (materialId: string) => MaterialProgress | null;
  materialActivities: (materialId: string) => LearningActivity[];
  recentActivities: (limit?: number) => LearningActivity[];
  recommendationForMaterial: (materialId: string) => StudyRecommendation | null;
  globalLearning: () => GlobalLearning;
  globalRecommendation: () => GlobalRecommendation | null;
  setMaterialGoal: (
    materialId: string,
    goal: { type: MaterialGoalType; targetDate?: string | null },
  ) => void;
  clearMaterialGoal: (materialId: string) => void;

  // study
  startSession: (deckId: string) => StudySession;
  recordReview: (args: {
    sessionId: string;
    deckId: string;
    cardId: string;
    rating: ReviewRating;
    responseMs: number;
  }) => db.ReviewOutcome;
  endSession: (sessionId: string) => void;
  finishStudySession: (args: {
    sessionId: string;
    materialId?: string | null;
    masteryBefore?: number | null;
  }) => db.FinishSessionOutcome;

  resetAll: () => void;
  exportJSON: () => string;

  /** Language Learning Mode */
  lang: LanguageStoreApi;
  /** Conversation Mode (also reachable as `lang.conversation`) */
  conversation: ConversationStoreApi;
  /** Universal Quiz System */
  quiz: QuizStoreApi;
  /** The Universal Learning Hub — "what should I do next?" */
  learning: LearningHubApi;
}

interface LearningHubApi {
  /** the single most valuable next action — always returns something */
  nextBestAction: () => LearningRecommendation;
  /** every recommendation, most important first (deterministic) */
  recommendations: () => LearningRecommendation[];
  /** current weaknesses from real evidence, most severe first */
  weaknesses: () => LearningWeakness[];
  /** a deterministic, time-budgeted plan for today */
  dailyPlan: (availableMinutes?: number) => DailyPlan;
  /** per-area progress — every subject shown separately */
  areas: () => LearningAreaProgress[];
  /** learning areas the user is genuinely engaged with */
  activeSources: () => LearningSource[];
  /** unified recent-progress feed across every system */
  recentProgress: (limit?: number) => UnifiedActivity[];
  /** the whole unified activity stream */
  activity: (limit?: number) => UnifiedActivity[];
  /** honest mastery signal for one area */
  masteryFor: (sourceType: LearningSourceType, sourceId: string) => MasterySignal;
}

interface QuizStoreApi {
  list: () => QuizWithMeta[];
  get: (id: string) => Quiz | undefined;
  attempts: (quizId: string) => QuizAttempt[];
  resultView: (attemptId: string) => QuizResultView | null;
  /** pure — preview questions before creating the quiz */
  generate: (source: QuizSource, recipe: QuizRecipe) => QuizGenerationResult;
  regenerate: (quizId: string) => QuizGenerationResult;
  create: (input: quizdb.CreateQuizInput) => Quiz;
  update: (
    id: string,
    patch: Partial<Pick<Quiz, "title" | "questions" | "status">>,
  ) => void;
  remove: (id: string) => void;
  finishAttempt: (args: quizdb.FinishQuizArgs) => quizdb.FinishQuizOutcome;
  /** pure deterministic answer check */
  check: (question: QuizQuestion, given: string) => boolean;
}

interface LanguageStoreApi {
  profiles: langdb.LanguageProfileWithMeta[];
  getProfile: (id: string) => langdb.LanguageProfileWithMeta | undefined;
  progress: (profileId: string) => LanguageProgress | null;
  recommendation: (profileId: string) => LanguageRecommendation | null;
  activities: (profileId: string) => LanguageActivity[];
  dueVocab: (profileId: string, limit?: number) => LanguageVocabularyItem[];
  newVocab: (profileId: string, limit?: number) => LanguageVocabularyItem[];
  vocab: (profileId: string) => LanguageVocabularyItem[];

  createProfile: (input: langdb.CreateLanguageInput) => string;
  deleteProfile: (id: string) => void;
  updateProfile: (
    id: string,
    patch: Parameters<typeof langdb.updateLanguageProfile>[2],
  ) => void;
  setRomanizationMode: (
    id: string,
    mode: Parameters<typeof langdb.setRomanizationMode>[2],
  ) => void;

  addCustomVocab: (
    profileId: string,
    input: langdb.CustomVocabInput,
  ) => LanguageVocabularyItem;
  addVocabFromWord: (
    profileId: string,
    word: { target: string; translation: string; pronunciation: string },
  ) => LanguageVocabularyItem;
  deleteVocab: (vocabId: string) => void;

  recordReview: (args: langdb.RecordReviewArgs) => langdb.LanguageReviewOutcome;
  recordPronunciationAttempt: (args: {
    profileId: string;
    vocabId?: string | null;
    lineId?: string | null;
    durationMs: number;
  }) => void;
  startSession: (
    profileId: string,
    blocks: import("@/lib/language/types").PracticeMode[],
  ) => import("@/lib/language/types").LanguageSession;
  finishSession: (
    args: Parameters<typeof langdb.finishLanguageSession>[1],
  ) => langdb.FinishLanguageSessionOutcome;
  recordChallengeResult: (
    args: Parameters<typeof langdb.recordChallengeResult>[1],
  ) => langdb.ChallengeOutcome;
  setGoal: (
    profileId: string,
    goal: Parameters<typeof langdb.setLanguageGoal>[2],
  ) => void;
  clearGoal: (profileId: string) => void;

  conversation: ConversationStoreApi;
}

interface ConversationStoreApi {
  scenarios: (profileId: string) => ConversationScenarioView[];
  scenario: (scenarioId: string) => ConversationScenario | undefined;
  progress: (profileId: string) => ConversationProgress;
  sessions: (profileId: string) => ConversationSession[];
  addVocab: (
    profileId: string,
    word: { target: string; translation: string; pronunciation: string },
    scenarioId: string,
  ) => { duplicate: boolean };
  finish: (
    args: convdb.FinishConversationArgs,
  ) => convdb.FinishConversationOutcome;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Pre-hydration state — an empty workspace. The real workspace loads from
  // storage in the effect below.
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot>(() => emptySnapshot());
  const [ready, setReady] = useState(false);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;

  useEffect(() => {
    const loaded = db.loadSnapshot();
    setSnapshot(loaded);
    setReady(true);
  }, []);

  const commit = useCallback((next: DatabaseSnapshot) => {
    snapRef.current = next;
    db.saveSnapshot(next);
    setSnapshot(next);
  }, []);

  const createDeck = useCallback(
    (input: db.DeckInput) => {
      const { snapshot: next, deck } = db.createDeck(snapRef.current, input);
      commit(next);
      return deck.id;
    },
    [commit],
  );

  const updateDeck = useCallback(
    (id: string, patch: Partial<db.DeckInput>) =>
      commit(db.updateDeck(snapRef.current, id, patch)),
    [commit],
  );

  const deleteDeck = useCallback(
    (id: string) => commit(db.deleteDeck(snapRef.current, id)),
    [commit],
  );

  const createCard = useCallback(
    (deckId: string, input: db.CardInput) => {
      const { snapshot: next, card } = db.createCard(
        snapRef.current,
        deckId,
        input,
      );
      commit(next);
      return card;
    },
    [commit],
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<db.CardInput>) =>
      commit(db.updateCard(snapRef.current, id, patch)),
    [commit],
  );

  const deleteCard = useCallback(
    (id: string) => commit(db.deleteCard(snapRef.current, id)),
    [commit],
  );

  const addMaterial = useCallback<StoreContextValue["addMaterial"]>(
    (input) => {
      const result = db.addMaterial(snapRef.current, input);
      if (result.ok) commit(result.snapshot);
      return result;
    },
    [commit],
  );

  const deleteMaterial = useCallback(
    (id: string) => commit(db.deleteMaterial(snapRef.current, id)),
    [commit],
  );

  const renameMaterial = useCallback(
    (id: string, name: string) =>
      commit(db.renameMaterial(snapRef.current, id, name)),
    [commit],
  );

  const setMaterialDeck = useCallback(
    (id: string, deckId: string | null) =>
      commit(db.setMaterialDeck(snapRef.current, id, deckId)),
    [commit],
  );

  const createFlashcardsFromMaterial = useCallback<
    StoreContextValue["createFlashcardsFromMaterial"]
  >(
    (args) => {
      const result = db.createFlashcardsFromMaterial(snapRef.current, args);
      commit(result.snapshot);
      return result;
    },
    [commit],
  );

  const addLearningItem = useCallback<StoreContextValue["addLearningItem"]>(
    (args) => {
      const { snapshot: next, item } = db.addLearningItem(snapRef.current, args);
      commit(next);
      return item;
    },
    [commit],
  );

  const deleteLearningItem = useCallback(
    (id: string, opts?: { alsoDeleteCards?: boolean }) =>
      commit(db.deleteLearningItem(snapRef.current, id, opts)),
    [commit],
  );

  const recordQuizResult = useCallback<StoreContextValue["recordQuizResult"]>(
    (args) => {
      const outcome = db.recordQuizResult(snapRef.current, args);
      commit(outcome.snapshot);
      return outcome;
    },
    [commit],
  );

  const startSession = useCallback(
    (deckId: string) => {
      const { snapshot: next, session } = db.startSession(
        snapRef.current,
        deckId,
      );
      commit(next);
      return session;
    },
    [commit],
  );

  const recordReview = useCallback<StoreContextValue["recordReview"]>(
    (args) => {
      const outcome = db.recordReview(snapRef.current, args);
      commit(outcome.snapshot);
      return outcome;
    },
    [commit],
  );

  const endSession = useCallback(
    (sessionId: string) => commit(db.endSession(snapRef.current, sessionId)),
    [commit],
  );

  const finishStudySession = useCallback<
    StoreContextValue["finishStudySession"]
  >(
    (args) => {
      const outcome = db.finishStudySession(snapRef.current, args);
      commit(outcome.snapshot);
      return outcome;
    },
    [commit],
  );

  const setMaterialGoal = useCallback<StoreContextValue["setMaterialGoal"]>(
    (materialId, goal) =>
      commit(db.setMaterialGoal(snapRef.current, materialId, goal)),
    [commit],
  );

  const clearMaterialGoal = useCallback(
    (materialId: string) =>
      commit(db.clearMaterialGoal(snapRef.current, materialId)),
    [commit],
  );

  const resetAll = useCallback(() => commit(db.resetSnapshot()), [commit]);
  const exportJSON = useCallback(
    () => JSON.stringify(snapRef.current, null, 2),
    [],
  );

  /* -------- Language Learning Mode -------- */
  const lang = useMemo<LanguageStoreApi>(() => {
    const s = snapshot;
    return {
      profiles: langdb.languageProfilesWithMeta(s),
      getProfile: (id) =>
        langdb.languageProfilesWithMeta(s).find((p) => p.profile.id === id),
      progress: (id) => {
        const p = langdb.getLanguageProfile(s, id);
        return p ? langdb.languageProgress(s, p) : null;
      },
      recommendation: (id) => langdb.recommendationFor(s, id),
      activities: (id) => langdb.languageActivitiesForProfile(s, id),
      dueVocab: (id, limit) => langdb.dueVocab(s, id, limit),
      newVocab: (id, limit) => langdb.newVocab(s, id, limit),
      vocab: (id) => langdb.vocabForProfile(s, id),

      createProfile: (input) => {
        const { snapshot: next, profile } = langdb.createLanguageProfile(
          snapRef.current,
          input,
        );
        commit(next);
        return profile.id;
      },
      deleteProfile: (id) =>
        commit(langdb.deleteLanguageProfile(snapRef.current, id)),
      updateProfile: (id, patch) =>
        commit(langdb.updateLanguageProfile(snapRef.current, id, patch)),
      setRomanizationMode: (id, mode) =>
        commit(langdb.setRomanizationMode(snapRef.current, id, mode)),

      addCustomVocab: (profileId, input) => {
        const { snapshot: next, item } = langdb.addCustomVocab(
          snapRef.current,
          profileId,
          input,
        );
        commit(next);
        return item;
      },
      addVocabFromWord: (profileId, word) => {
        const { snapshot: next, item } = langdb.addVocabFromWord(
          snapRef.current,
          profileId,
          word,
        );
        commit(next);
        return item;
      },
      deleteVocab: (id) => commit(langdb.deleteVocab(snapRef.current, id)),

      recordReview: (args) => {
        const outcome = langdb.recordLanguageReview(snapRef.current, args);
        commit(outcome.snapshot);
        return outcome;
      },
      recordPronunciationAttempt: (args) =>
        commit(langdb.recordPronunciationAttempt(snapRef.current, args)),
      startSession: (profileId, blocks) => {
        const { snapshot: next, session } = langdb.startLanguageSession(
          snapRef.current,
          profileId,
          blocks,
        );
        commit(next);
        return session;
      },
      finishSession: (args) => {
        const outcome = langdb.finishLanguageSession(snapRef.current, args);
        commit(outcome.snapshot);
        return outcome;
      },
      recordChallengeResult: (args) => {
        const outcome = langdb.recordChallengeResult(snapRef.current, args);
        commit(outcome.snapshot);
        return outcome;
      },
      setGoal: (profileId, goal) =>
        commit(langdb.setLanguageGoal(snapRef.current, profileId, goal)),
      clearGoal: (profileId) =>
        commit(langdb.clearLanguageGoal(snapRef.current, profileId)),

      conversation: {
        scenarios: (profileId) => {
          const p = langdb.getLanguageProfile(s, profileId);
          return p ? convdb.scenarioViewsForProfile(s, p) : [];
        },
        scenario: (scenarioId) => scenarioById(scenarioId),
        progress: (profileId) => convdb.conversationProgress(s, profileId),
        sessions: (profileId) =>
          convdb.conversationSessionsForProfile(s, profileId),
        addVocab: (profileId, word, scenarioId) => {
          const { snapshot: next, duplicate } = convdb.addConversationVocab(
            snapRef.current,
            profileId,
            word,
            scenarioId,
          );
          commit(next);
          return { duplicate };
        },
        finish: (args) => {
          const outcome = convdb.finishConversation(snapRef.current, args);
          commit(outcome.snapshot);
          return outcome;
        },
      },
    };
  }, [snapshot, commit]);

  /* -------- Universal Quiz System -------- */
  const quiz = useMemo<QuizStoreApi>(() => {
    const s = snapshot;
    return {
      list: () => quizdb.quizzesWithMeta(s),
      get: (id) => quizdb.getQuiz(s, id),
      attempts: (quizId) => quizdb.attemptsForQuiz(s, quizId),
      resultView: (attemptId) => quizdb.buildResultView(s, attemptId),
      generate: (source, recipe) =>
        generateQuizQuestions(snapRef.current, source, recipe),
      regenerate: (quizId) => {
        const q = quizdb.getQuiz(snapRef.current, quizId);
        return q
          ? regenerateQuiz(snapRef.current, q)
          : { ok: false as const, reason: "no-text" as const, message: "Quiz not found." };
      },
      create: (input) => {
        const { snapshot: next, quiz: created } = quizdb.createQuiz(
          snapRef.current,
          input,
        );
        commit(next);
        return created;
      },
      update: (id, patch) => commit(quizdb.updateQuiz(snapRef.current, id, patch)),
      remove: (id) => commit(quizdb.deleteQuiz(snapRef.current, id)),
      finishAttempt: (args) => {
        const outcome = quizdb.finishQuizAttempt(snapRef.current, args);
        commit(outcome.snapshot);
        return outcome;
      },
      check: (question, given) => quizdb.checkAnswer(question, given),
    };
  }, [snapshot, commit]);

  const decks = useMemo(() => db.decksWithMeta(snapshot), [snapshot]);
  const materials = useMemo(() => db.materialsWithMeta(snapshot), [snapshot]);

  const value = useMemo<StoreContextValue>(
    () => ({
      ready,
      snapshot,
      decks,
      getDeck: (id) => decks.find((d) => d.id === id),
      getCards: (deckId) => db.cardsForDeck(snapshot, deckId),
      buildQueue: (deckId, opts) =>
        db.buildStudyQueue(snapshot, deckId, opts),
      createDeck,
      updateDeck,
      deleteDeck,
      createCard,
      updateCard,
      deleteCard,
      materials,
      getMaterial: (id) => materials.find((m) => m.id === id),
      materialsForDeck: (deckId) =>
        materials.filter((m) => m.deckId === deckId),
      addMaterial,
      deleteMaterial,
      renameMaterial,
      setMaterialDeck,
      learningItemsForMaterial: (materialId) =>
        db.learningItemsForMaterial(snapshot, materialId),
      learningItemsForDeck: (deckId) =>
        db.learningItemsForDeck(snapshot, deckId),
      getLearningItem: (id) => db.getLearningItem(snapshot, id),
      createFlashcardsFromMaterial,
      addLearningItem,
      deleteLearningItem,
      recordQuizResult,
      getMaterialProgress: (materialId) =>
        db.getMaterialProgress(snapshot, materialId),
      materialActivities: (materialId) =>
        db.activitiesForMaterial(snapshot, materialId),
      recentActivities: (limit) => db.recentActivities(snapshot, limit),
      recommendationForMaterial: (materialId) =>
        db.recommendationForMaterial(snapshot, materialId),
      globalLearning: () => globalLearning(snapshot),
      globalRecommendation: () => getGlobalRecommendation(snapshot),
      setMaterialGoal,
      clearMaterialGoal,
      startSession,
      recordReview,
      endSession,
      finishStudySession,
      lang,
      conversation: lang.conversation,
      quiz,
      learning: {
        nextBestAction: () => getNextBestAction(snapshot),
        recommendations: () => buildRecommendations(snapshot),
        weaknesses: () => detectWeaknesses(snapshot),
        dailyPlan: (availableMinutes) =>
          buildDailyLearningPlan(snapshot, availableMinutes),
        areas: () => getLearningAreas(snapshot),
        activeSources: () => activeSources(snapshot),
        recentProgress: (limit) => recentProgress(snapshot, limit),
        activity: (limit) => unifiedActivity(snapshot, limit),
        masteryFor: (sourceType, sourceId) =>
          masterySignalFor(snapshot, sourceType, sourceId),
      },
      resetAll,
      exportJSON,
    }),
    [
      ready,
      snapshot,
      decks,
      materials,
      lang,
      quiz,
      createDeck,
      updateDeck,
      deleteDeck,
      createCard,
      updateCard,
      deleteCard,
      addMaterial,
      deleteMaterial,
      renameMaterial,
      setMaterialDeck,
      createFlashcardsFromMaterial,
      addLearningItem,
      deleteLearningItem,
      recordQuizResult,
      setMaterialGoal,
      clearMaterialGoal,
      startSession,
      recordReview,
      endSession,
      finishStudySession,
      resetAll,
      exportJSON,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}

export function useDecks() {
  return useStore().decks;
}

export function useStats() {
  return useStore().snapshot.stats;
}

export function useUser() {
  return useStore().snapshot.user;
}

export type { AchievementId, StudyMaterial };
