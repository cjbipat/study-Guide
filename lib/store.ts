/**
 * Storage + pure mutation layer.
 *
 * Everything here operates on an immutable `DatabaseSnapshot`. The React layer
 * (store-context) owns the live copy and calls these reducers. Persistence is
 * isolated in `loadSnapshot` / `saveSnapshot` — swap those two functions for
 * Supabase calls and the rest of the app is unchanged.
 */

import {
  ACHIEVEMENT_MAP,
  AchievementContext,
  evaluateAchievements,
} from "@/lib/achievements";
import { buildSeedSnapshot, SCHEMA_VERSION } from "@/lib/mock-data";
import { schedule } from "@/lib/study/scheduler";
import { deckMastery, isDue, isNew } from "@/lib/study/scheduler";
import {
  crossedMilestone,
  materialActivities as materialActivitiesSelector,
  materialMastery,
  materialProgress as materialProgressSelector,
  type Milestone,
} from "@/lib/materials/progress";
import { getRecommendedStudyAction } from "@/lib/materials/recommendation";
import type {
  AchievementId,
  Card,
  DatabaseSnapshot,
  Deck,
  DeckTheme,
  DeckWithMeta,
  GenerationConfig,
  GenerationSource,
  LearningActivity,
  LearningActivityType,
  LearningItem,
  LearningItemType,
  MaterialGoal,
  MaterialGoalType,
  MaterialKind,
  MaterialProgress,
  MaterialWithMeta,
  QuizQuestion,
  ReviewRating,
  StudyGuideSection,
  StudyMaterial,
  StudyRecommendation,
  StudySession,
  SummaryContent,
} from "@/lib/types";
import { materialKindFor } from "@/lib/materials/text-extract";
import { XP_BY_RATING } from "@/lib/xp";
import { todayKey, uid } from "@/lib/utils";

const STORAGE_KEY = "studyquest.snapshot.v3";

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

function withNameOverride(snap: DatabaseSnapshot): DatabaseSnapshot {
  if (typeof window === "undefined") return snap;
  const name = window.localStorage.getItem("studyquest.name");
  if (name && name.trim() && name.trim() !== snap.user.name) {
    return { ...snap, user: { ...snap.user, name: name.trim() } };
  }
  return snap;
}

export function loadSnapshot(): DatabaseSnapshot {
  if (typeof window === "undefined") return buildSeedSnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = withNameOverride(buildSeedSnapshot());
      saveSnapshot(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as DatabaseSnapshot;
    if (!parsed || parsed.version !== SCHEMA_VERSION) {
      const seed = withNameOverride(buildSeedSnapshot());
      saveSnapshot(seed);
      return seed;
    }
    if (!Array.isArray(parsed.materials)) parsed.materials = [];
    if (!Array.isArray(parsed.learningItems)) parsed.learningItems = [];
    if (!Array.isArray(parsed.activities)) parsed.activities = [];
    if (!Array.isArray(parsed.goals)) parsed.goals = [];
    if (!Array.isArray(parsed.languages)) parsed.languages = [];
    if (!Array.isArray(parsed.vocab)) parsed.vocab = [];
    if (!Array.isArray(parsed.languageReviews)) parsed.languageReviews = [];
    if (!Array.isArray(parsed.languageSessions)) parsed.languageSessions = [];
    if (!Array.isArray(parsed.languageActivities)) parsed.languageActivities = [];
    if (!Array.isArray(parsed.pronunciationAttempts))
      parsed.pronunciationAttempts = [];
    if (!Array.isArray(parsed.languageGoals)) parsed.languageGoals = [];
    if (!Array.isArray(parsed.conversationSessions))
      parsed.conversationSessions = [];
    if (!Array.isArray(parsed.quizzes)) parsed.quizzes = [];
    if (!Array.isArray(parsed.quizAttempts)) parsed.quizAttempts = [];
    return withNameOverride(parsed);
  } catch {
    return buildSeedSnapshot();
  }
}

export function saveSnapshot(snapshot: DatabaseSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode — run in-memory only */
  }
}

export function resetSnapshot(): DatabaseSnapshot {
  const seed = buildSeedSnapshot();
  saveSnapshot(seed);
  return seed;
}

/* ------------------------------------------------------------------ */
/*  Selectors                                                          */
/* ------------------------------------------------------------------ */

export function cardsForDeck(snap: DatabaseSnapshot, deckId: string): Card[] {
  return snap.cards.filter((c) => c.deckId === deckId);
}

export function deckWithMeta(snap: DatabaseSnapshot, deck: Deck): DeckWithMeta {
  const cards = cardsForDeck(snap, deck.id);
  const now = new Date();
  const items = snap.learningItems.filter((i) => i.deckId === deck.id);
  return {
    ...deck,
    cardCount: cards.length,
    dueCount: cards.filter((c) => !isNew(c) && isDue(c, now)).length,
    newCount: cards.filter((c) => isNew(c)).length,
    mastery: deckMastery(cards),
    materialCount: snap.materials.filter((m) => m.deckId === deck.id).length,
    quizCount: items.filter((i) => i.type === "quiz").length,
    guideCount: items.filter(
      (i) => i.type === "study-guide" || i.type === "summary",
    ).length,
  };
}

export function decksWithMeta(snap: DatabaseSnapshot): DeckWithMeta[] {
  return snap.decks
    .map((d) => deckWithMeta(snap, d))
    .sort((a, b) => {
      const at = a.lastStudiedAt ? Date.parse(a.lastStudiedAt) : 0;
      const bt = b.lastStudiedAt ? Date.parse(b.lastStudiedAt) : 0;
      return bt - at;
    });
}

/** Cards to study this session: due cards first, then a handful of new ones. */
export function buildStudyQueue(
  snap: DatabaseSnapshot,
  deckId: string,
  opts: { newLimit?: number; max?: number; onlyCardIds?: string[] } = {},
): Card[] {
  const { newLimit = 8, max = 30, onlyCardIds } = opts;
  let cards = cardsForDeck(snap, deckId);
  if (onlyCardIds && onlyCardIds.length) {
    const set = new Set(onlyCardIds);
    cards = cards.filter((c) => set.has(c.id));
    return [...cards].sort(
      (a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt),
    );
  }
  const now = new Date();
  const due = cards
    .filter((c) => !isNew(c) && isDue(c, now))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const fresh = cards.filter(isNew).slice(0, newLimit);
  const queue = [...due, ...fresh].slice(0, max);
  // If a deck has nothing due (all mastered / not yet due), fall back to a
  // light refresher of the soonest-due cards so "Study" is never a dead end.
  if (queue.length === 0 && cards.length > 0) {
    return [...cards]
      .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
      .slice(0, Math.min(12, cards.length));
  }
  return queue;
}

/* ------------------------------------------------------------------ */
/*  Mutations (pure — return a new snapshot)                           */
/* ------------------------------------------------------------------ */

export interface DeckInput {
  name: string;
  description: string;
  theme: DeckTheme;
  icon: string;
}

export function createDeck(snap: DatabaseSnapshot, input: DeckInput): {
  snapshot: DatabaseSnapshot;
  deck: Deck;
} {
  const deck: Deck = {
    id: uid("deck"),
    userId: snap.user.id,
    name: input.name.trim() || "Untitled deck",
    description: input.description.trim(),
    theme: input.theme,
    icon: input.icon || "📚",
    createdAt: new Date().toISOString(),
    lastStudiedAt: null,
  };
  return { snapshot: { ...snap, decks: [...snap.decks, deck] }, deck };
}

export function updateDeck(
  snap: DatabaseSnapshot,
  deckId: string,
  patch: Partial<DeckInput>,
): DatabaseSnapshot {
  return {
    ...snap,
    decks: snap.decks.map((d) => (d.id === deckId ? { ...d, ...patch } : d)),
  };
}

export function deleteDeck(snap: DatabaseSnapshot, deckId: string): DatabaseSnapshot {
  return {
    ...snap,
    decks: snap.decks.filter((d) => d.id !== deckId),
    cards: snap.cards.filter((c) => c.deckId !== deckId),
    // Materials survive a deck deletion — they belong to the user's library.
    materials: snap.materials.map((m) =>
      m.deckId === deckId ? { ...m, deckId: null } : m,
    ),
    learningItems: snap.learningItems.filter((i) => i.deckId !== deckId),
    // Keep material-scoped history; drop deck-only activity records.
    activities: snap.activities.filter(
      (a) => a.deckId !== deckId || a.materialId !== null,
    ),
    reviews: snap.reviews.filter((r) => r.deckId !== deckId),
    sessions: snap.sessions.filter((s) => s.deckId !== deckId),
  };
}

/* ------------------------------------------------------------------ */
/*  Learning activity log — the single source of history               */
/* ------------------------------------------------------------------ */

function appendActivity(
  snap: DatabaseSnapshot,
  activity: Omit<LearningActivity, "id" | "at"> & { at?: string },
): DatabaseSnapshot {
  const record: LearningActivity = {
    id: uid("act"),
    at: activity.at ?? new Date().toISOString(),
    ...activity,
  };
  return { ...snap, activities: [...snap.activities, record] };
}

export function activitiesForMaterial(
  snap: DatabaseSnapshot,
  materialId: string,
): LearningActivity[] {
  return materialActivitiesSelector(snap, materialId);
}

export function recentActivities(
  snap: DatabaseSnapshot,
  limit = 12,
): LearningActivity[] {
  return [...snap.activities]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, limit);
}

export function getMaterialProgress(
  snap: DatabaseSnapshot,
  materialId: string,
): MaterialProgress | null {
  const material = snap.materials.find((m) => m.id === materialId);
  return material ? materialProgressSelector(snap, material) : null;
}

export function recommendationForMaterial(
  snap: DatabaseSnapshot,
  materialId: string,
): StudyRecommendation | null {
  const material = snap.materials.find((m) => m.id === materialId);
  return material ? getRecommendedStudyAction(snap, material) : null;
}

/* ------------------------------------------------------------------ */
/*  Material goals                                                     */
/* ------------------------------------------------------------------ */

export function setMaterialGoal(
  snap: DatabaseSnapshot,
  materialId: string,
  goal: { type: MaterialGoalType; targetDate?: string | null },
): DatabaseSnapshot {
  const existing = snap.goals.find((g) => g.materialId === materialId);
  const next: MaterialGoal = {
    materialId,
    type: goal.type,
    targetDate: goal.targetDate ?? null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    completedAt: null,
  };
  return {
    ...snap,
    goals: [
      ...snap.goals.filter((g) => g.materialId !== materialId),
      next,
    ],
  };
}

export function clearMaterialGoal(
  snap: DatabaseSnapshot,
  materialId: string,
): DatabaseSnapshot {
  return { ...snap, goals: snap.goals.filter((g) => g.materialId !== materialId) };
}

/* ------------------------------------------------------------------ */
/*  Study materials — the user's source-material library               */
/* ------------------------------------------------------------------ */

export const MAX_MATERIAL_BYTES = 2 * 1024 * 1024; // 2 MB per file
export const MAX_LIBRARY_BYTES = 10 * 1024 * 1024; // ~10 MB total

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { materialKindFor };

export function allMaterials(snap: DatabaseSnapshot): StudyMaterial[] {
  return [...snap.materials].sort(
    (a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt),
  );
}

export function materialsForDeck(
  snap: DatabaseSnapshot,
  deckId: string,
): StudyMaterial[] {
  return snap.materials
    .filter((m) => m.deckId === deckId)
    .sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
}

export function getMaterial(
  snap: DatabaseSnapshot,
  id: string,
): StudyMaterial | undefined {
  return snap.materials.find((m) => m.id === id);
}

export function learningItemsForMaterial(
  snap: DatabaseSnapshot,
  materialId: string,
): LearningItem[] {
  return snap.learningItems
    .filter((i) => i.materialId === materialId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function learningItemsForDeck(
  snap: DatabaseSnapshot,
  deckId: string,
): LearningItem[] {
  return snap.learningItems
    .filter((i) => i.deckId === deckId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getLearningItem(
  snap: DatabaseSnapshot,
  id: string,
): LearningItem | undefined {
  return snap.learningItems.find((i) => i.id === id);
}

export function materialWithMeta(
  snap: DatabaseSnapshot,
  material: StudyMaterial,
): MaterialWithMeta {
  const items = learningItemsForMaterial(snap, material.id);
  const flashcardCount = items
    .filter((i) => i.type === "flashcards")
    .reduce((acc, i) => acc + (i.cardIds?.length ?? 0), 0);
  const progress = materialProgressSelector(snap, material);
  return {
    ...material,
    deckName: material.deckId
      ? (snap.decks.find((d) => d.id === material.deckId)?.name ?? null)
      : null,
    flashcardCount,
    quizCount: items.filter((i) => i.type === "quiz").length,
    guideCount: items.filter((i) => i.type === "study-guide").length,
    summaryCount: items.filter((i) => i.type === "summary").length,
    learningItemCount: items.length,
    mastery: progress.score,
    masteryStatus: progress.status,
    lastStudiedAt: progress.lastStudiedAt,
  };
}

export function materialsWithMeta(snap: DatabaseSnapshot): MaterialWithMeta[] {
  return allMaterials(snap).map((m) => materialWithMeta(snap, m));
}

export interface MaterialInput {
  deckId: string | null;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  kind: MaterialKind;
  extractedText: string | null;
  textTruncated: boolean;
}

export type AddMaterialResult =
  | { ok: true; snapshot: DatabaseSnapshot; material: StudyMaterial }
  | { ok: false; error: string };

export function addMaterial(
  snap: DatabaseSnapshot,
  input: MaterialInput,
): AddMaterialResult {
  if (input.size > MAX_MATERIAL_BYTES) {
    return {
      ok: false,
      error: `"${input.name}" is ${formatBytes(input.size)} — files must be under ${formatBytes(
        MAX_MATERIAL_BYTES,
      )}.`,
    };
  }
  const libraryTotal = snap.materials.reduce((acc, m) => acc + m.size, 0);
  if (libraryTotal + input.size > MAX_LIBRARY_BYTES) {
    return {
      ok: false,
      error: `Your material library would exceed ${formatBytes(
        MAX_LIBRARY_BYTES,
      )}. Remove something first.`,
    };
  }

  const material: StudyMaterial = {
    id: uid("mat"),
    deckId: input.deckId,
    name: input.name.trim() || "Untitled material",
    mime: input.mime || "application/octet-stream",
    kind: input.kind,
    size: input.size,
    dataUrl: input.dataUrl,
    addedAt: new Date().toISOString(),
    status: "ready",
    extractedText: input.extractedText,
    textTruncated: input.textTruncated,
  };
  const next = appendActivity(
    { ...snap, materials: [...snap.materials, material] },
    {
      type: "material-added",
      materialId: material.id,
      deckId: material.deckId,
      detail: material.name,
    },
  );
  return { ok: true, snapshot: next, material };
}

export function deleteMaterial(
  snap: DatabaseSnapshot,
  materialId: string,
): DatabaseSnapshot {
  // Learning items generated from it go away; flashcards stay in their deck but
  // lose the source link. Activity + goal for it are removed.
  return {
    ...snap,
    materials: snap.materials.filter((m) => m.id !== materialId),
    learningItems: snap.learningItems.filter((i) => i.materialId !== materialId),
    activities: snap.activities.filter((a) => a.materialId !== materialId),
    goals: snap.goals.filter((g) => g.materialId !== materialId),
    cards: snap.cards.map((c) =>
      c.sourceMaterialId === materialId ? { ...c, sourceMaterialId: null } : c,
    ),
  };
}

export function renameMaterial(
  snap: DatabaseSnapshot,
  materialId: string,
  name: string,
): DatabaseSnapshot {
  return {
    ...snap,
    materials: snap.materials.map((m) =>
      m.id === materialId ? { ...m, name: name.trim() || m.name } : m,
    ),
  };
}

export function setMaterialDeck(
  snap: DatabaseSnapshot,
  materialId: string,
  deckId: string | null,
): DatabaseSnapshot {
  return {
    ...snap,
    materials: snap.materials.map((m) =>
      m.id === materialId ? { ...m, deckId } : m,
    ),
    learningItems: snap.learningItems.map((i) =>
      i.materialId === materialId ? { ...i, deckId } : i,
    ),
  };
}

/* ------------------------------------------------------------------ */
/*  Learning items generated from materials                            */
/* ------------------------------------------------------------------ */

export interface FlashcardDraft {
  question: string;
  answer: string;
  tags: string[];
}

/** Turn accepted flashcard drafts into real Cards + a flashcards LearningItem. */
export function createFlashcardsFromMaterial(
  snap: DatabaseSnapshot,
  args: {
    materialId: string;
    deckId: string;
    drafts: FlashcardDraft[];
    config: GenerationConfig;
    source: GenerationSource;
    title: string;
  },
): { snapshot: DatabaseSnapshot; item: LearningItem; cardIds: string[] } {
  const nowIso = new Date().toISOString();
  const newCards: Card[] = args.drafts.map((d, i) => ({
    id: uid("card"),
    deckId: args.deckId,
    question: d.question.trim(),
    answer: d.answer.trim(),
    tags: d.tags,
    createdAt: new Date(Date.now() + i).toISOString(),
    sourceMaterialId: args.materialId,
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: nowIso,
    lastReviewedAt: null,
    lapses: 0,
  }));
  const cardIds = newCards.map((c) => c.id);

  const item: LearningItem = {
    id: uid("li"),
    type: "flashcards",
    materialId: args.materialId,
    deckId: args.deckId,
    title: args.title,
    createdAt: nowIso,
    config: args.config,
    source: args.source,
    cardIds,
  };

  const next = appendActivity(
    {
      ...snap,
      cards: [...snap.cards, ...newCards],
      learningItems: [...snap.learningItems, item],
    },
    {
      type: "flashcards-created",
      materialId: args.materialId,
      deckId: args.deckId,
      learningItemId: item.id,
      detail: `${cardIds.length} flashcard${cardIds.length === 1 ? "" : "s"}`,
    },
  );

  return { snapshot: next, item, cardIds };
}

const ITEM_ACTIVITY: Record<
  Exclude<LearningItemType, "flashcards">,
  LearningActivityType
> = {
  quiz: "quiz-created",
  "study-guide": "guide-created",
  summary: "summary-created",
};

export function addLearningItem(
  snap: DatabaseSnapshot,
  args: {
    type: Exclude<LearningItemType, "flashcards">;
    materialId: string;
    deckId: string | null;
    title: string;
    config: GenerationConfig;
    source: GenerationSource;
    questions?: QuizQuestion[];
    sections?: StudyGuideSection[];
    summary?: SummaryContent;
  },
): { snapshot: DatabaseSnapshot; item: LearningItem } {
  const item: LearningItem = {
    id: uid("li"),
    type: args.type,
    materialId: args.materialId,
    deckId: args.deckId,
    title: args.title,
    createdAt: new Date().toISOString(),
    config: args.config,
    source: args.source,
    questions: args.questions,
    sections: args.sections,
    summary: args.summary,
    lastScore: args.type === "quiz" ? null : undefined,
  };
  const next = appendActivity(
    { ...snap, learningItems: [...snap.learningItems, item] },
    {
      type: ITEM_ACTIVITY[args.type],
      materialId: args.materialId,
      deckId: args.deckId,
      learningItemId: item.id,
      detail: args.title,
    },
  );
  return { snapshot: next, item };
}

export function deleteLearningItem(
  snap: DatabaseSnapshot,
  itemId: string,
  opts: { alsoDeleteCards?: boolean } = {},
): DatabaseSnapshot {
  const item = snap.learningItems.find((i) => i.id === itemId);
  const removedCardIds = new Set<string>(
    item?.type === "flashcards" && opts.alsoDeleteCards ? (item.cardIds ?? []) : [],
  );
  return {
    ...snap,
    cards: snap.cards.filter((c) => !removedCardIds.has(c.id)),
    learningItems: snap.learningItems.filter((i) => i.id !== itemId),
    reviews: snap.reviews.filter((r) => !removedCardIds.has(r.cardId)),
  };
}

export interface QuizOutcome {
  snapshot: DatabaseSnapshot;
  xpEarned: number;
  streak: number;
  accuracy: number;
  milestone: Milestone | null;
  masteryBefore: number | null;
  masteryAfter: number | null;
}

/** Record a completed quiz — counts as studying today (XP + streak). */
export function recordQuizResult(
  snap: DatabaseSnapshot,
  args: { itemId: string; correct: number; total: number },
): QuizOutcome {
  const now = new Date();
  const nowIso = now.toISOString();
  const accuracy = args.total ? args.correct / args.total : 0;
  const xpEarned = args.correct * 8 + (accuracy >= 0.9 ? 25 : 0);

  const item = snap.learningItems.find((i) => i.id === args.itemId);
  const materialId = item?.materialId ?? null;
  const masteryBefore = materialId
    ? materialMastery(snap, materialId).score
    : null;

  const learningItems = snap.learningItems.map((i) =>
    i.id === args.itemId
      ? {
          ...i,
          lastScore: { correct: args.correct, total: args.total, takenAt: nowIso },
        }
      : i,
  );

  const stats = touchStudyDay(snap.stats, now, {
    xp: xpEarned,
    reviewed: 0,
    correct: 0,
  });

  let next: DatabaseSnapshot = { ...snap, learningItems, stats };
  const masteryAfter = materialId
    ? materialMastery(next, materialId).score
    : null;

  next = appendActivity(next, {
    type: "quiz-attempt",
    materialId,
    deckId: item?.deckId ?? null,
    learningItemId: args.itemId,
    reviewed: args.total,
    correct: args.correct,
    incorrect: args.total - args.correct,
    accuracy: Math.round(accuracy * 100),
    xpEarned,
    masteryBefore,
    masteryAfter,
    detail: `${Math.round(accuracy * 100)}% score`,
  });

  return {
    snapshot: next,
    xpEarned,
    streak: stats.currentStreak,
    accuracy: Math.round(accuracy * 100),
    milestone: crossedMilestone(masteryBefore, masteryAfter),
    masteryBefore,
    masteryAfter,
  };
}

/* ------------------------------------------------------------------ */
/*  Finish a flashcard session — the single place session history is   */
/*  written. Returns the summary + mastery movement for the UI.        */
/* ------------------------------------------------------------------ */

export interface SessionSummary {
  reviewed: number;
  correct: number;
  incorrect: number;
  accuracy: number; // 0..100
  xpEarned: number;
}

export interface FinishSessionOutcome {
  snapshot: DatabaseSnapshot;
  summary: SessionSummary;
  materialId: string | null;
  masteryBefore: number | null;
  masteryAfter: number | null;
  milestone: Milestone | null;
}

/** Infer which material a session was about from the cards actually reviewed. */
function inferSessionMaterial(
  snap: DatabaseSnapshot,
  sessionId: string,
  hint: string | null,
): string | null {
  if (hint) return hint;
  const counts = new Map<string, number>();
  for (const r of snap.reviews) {
    if (r.sessionId !== sessionId) continue;
    const card = snap.cards.find((c) => c.id === r.cardId);
    if (card?.sourceMaterialId) {
      counts.set(
        card.sourceMaterialId,
        (counts.get(card.sourceMaterialId) ?? 0) + 1,
      );
    }
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [id, n] of counts) if (n > bestN) [best, bestN] = [id, n];
  return best;
}

export function finishStudySession(
  snap: DatabaseSnapshot,
  args: {
    sessionId: string;
    materialId?: string | null;
    masteryBefore?: number | null;
  },
): FinishSessionOutcome {
  const nowIso = new Date().toISOString();
  const sessionReviews = snap.reviews.filter(
    (r) => r.sessionId === args.sessionId,
  );
  const reviewed = sessionReviews.length;
  const correct = sessionReviews.filter((r) => r.correct).length;
  const xpEarned = sessionReviews.reduce((a, r) => a + r.xpEarned, 0);
  const summary: SessionSummary = {
    reviewed,
    correct,
    incorrect: reviewed - correct,
    accuracy: reviewed ? Math.round((correct / reviewed) * 100) : 0,
    xpEarned,
  };

  const sessions = snap.sessions.map((s) =>
    s.id === args.sessionId && !s.endedAt ? { ...s, endedAt: nowIso } : s,
  );

  const session = snap.sessions.find((s) => s.id === args.sessionId);
  const materialId = inferSessionMaterial(
    snap,
    args.sessionId,
    args.materialId ?? null,
  );

  let next: DatabaseSnapshot = { ...snap, sessions };
  const masteryBefore =
    args.masteryBefore ??
    (materialId ? materialMastery(snap, materialId).score : null);
  const masteryAfter = materialId
    ? materialMastery(next, materialId).score
    : null;

  if (reviewed > 0) {
    next = appendActivity(next, {
      type: "flashcard-session",
      materialId,
      deckId: session?.deckId ?? null,
      sessionId: args.sessionId,
      reviewed,
      correct,
      incorrect: reviewed - correct,
      accuracy: summary.accuracy,
      xpEarned,
      masteryBefore,
      masteryAfter,
      detail: `${reviewed} card${reviewed === 1 ? "" : "s"} reviewed`,
    });
  }

  return {
    snapshot: next,
    summary,
    materialId,
    masteryBefore,
    masteryAfter,
    milestone: crossedMilestone(masteryBefore, masteryAfter),
  };
}

/** Shared streak / daily-stat / XP bump used by reviews and quizzes. */
export function touchStudyDay(
  statsIn: DatabaseSnapshot["stats"],
  now: Date,
  delta: { xp: number; reviewed: number; correct: number },
): DatabaseSnapshot["stats"] {
  const tk = todayKey(now);
  const stats = { ...statsIn };
  stats.totalReviews += delta.reviewed;
  stats.totalCorrect += delta.correct;
  stats.totalXp += delta.xp;

  const daily = [...stats.daily];
  const idx = daily.findIndex((d) => d.date === tk);
  if (idx >= 0) {
    daily[idx] = {
      ...daily[idx],
      reviewed: daily[idx].reviewed + delta.reviewed,
      correct: daily[idx].correct + delta.correct,
      xp: daily[idx].xp + delta.xp,
    };
  } else {
    daily.push({
      date: tk,
      reviewed: delta.reviewed,
      correct: delta.correct,
      xp: delta.xp,
    });
  }
  stats.daily = daily.slice(-30);

  if (stats.lastStudyDate !== tk) {
    const last = stats.lastStudyDate
      ? new Date(stats.lastStudyDate + "T00:00:00")
      : null;
    const gap = last
      ? Math.round(
          (new Date(tk + "T00:00:00").getTime() - last.getTime()) / 86_400_000,
        )
      : 1;
    stats.currentStreak = gap === 1 ? stats.currentStreak + 1 : 1;
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastStudyDate = tk;
  }
  return stats;
}

export interface CardInput {
  question: string;
  answer: string;
  tags: string[];
  imageUrl?: string;
  audioUrl?: string;
  sourceMaterialId?: string | null;
}

export function createCard(
  snap: DatabaseSnapshot,
  deckId: string,
  input: CardInput,
): { snapshot: DatabaseSnapshot; card: Card } {
  const nowIso = new Date().toISOString();
  const card: Card = {
    id: uid("card"),
    deckId,
    question: input.question.trim(),
    answer: input.answer.trim(),
    tags: input.tags,
    imageUrl: input.imageUrl,
    audioUrl: input.audioUrl,
    sourceMaterialId: input.sourceMaterialId ?? null,
    createdAt: nowIso,
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: nowIso,
    lastReviewedAt: null,
    lapses: 0,
  };
  return { snapshot: { ...snap, cards: [...snap.cards, card] }, card };
}

export function updateCard(
  snap: DatabaseSnapshot,
  cardId: string,
  patch: Partial<CardInput>,
): DatabaseSnapshot {
  return {
    ...snap,
    cards: snap.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
  };
}

export function deleteCard(snap: DatabaseSnapshot, cardId: string): DatabaseSnapshot {
  return {
    ...snap,
    cards: snap.cards.filter((c) => c.id !== cardId),
    reviews: snap.reviews.filter((r) => r.cardId !== cardId),
    learningItems: snap.learningItems.map((i) =>
      i.cardIds?.includes(cardId)
        ? { ...i, cardIds: i.cardIds.filter((x) => x !== cardId) }
        : i,
    ),
  };
}

/* ------------------------------------------------------------------ */
/*  Study session lifecycle                                            */
/* ------------------------------------------------------------------ */

export function startSession(snap: DatabaseSnapshot, deckId: string): {
  snapshot: DatabaseSnapshot;
  session: StudySession;
} {
  const session: StudySession = {
    id: uid("session"),
    deckId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    cardsReviewed: 0,
    cardsCorrect: 0,
    xpEarned: 0,
  };
  return { snapshot: { ...snap, sessions: [...snap.sessions, session] }, session };
}

export interface ReviewOutcome {
  snapshot: DatabaseSnapshot;
  xpEarned: number;
  correct: boolean;
  newAchievements: AchievementId[];
  streak: number;
  totalXp: number;
}

export function recordReview(
  snap: DatabaseSnapshot,
  args: {
    sessionId: string;
    deckId: string;
    cardId: string;
    rating: ReviewRating;
    responseMs: number;
  },
): ReviewOutcome {
  const now = new Date();
  const nowIso = now.toISOString();
  const card = snap.cards.find((c) => c.id === args.cardId);
  const xpEarned = XP_BY_RATING[args.rating];

  let cards = snap.cards;
  if (card) {
    const s = schedule(card, args.rating, now);
    cards = snap.cards.map((c) =>
      c.id === card.id
        ? {
            ...c,
            ease: s.ease,
            intervalDays: s.intervalDays,
            repetitions: s.repetitions,
            dueAt: s.dueAt,
            lapses: s.lapses,
            lastReviewedAt: nowIso,
          }
        : c,
    );
  }

  const correct = args.rating !== "again";

  const reviews = [
    ...snap.reviews,
    {
      id: uid("review"),
      cardId: args.cardId,
      deckId: args.deckId,
      sessionId: args.sessionId,
      rating: args.rating,
      correct,
      xpEarned,
      responseMs: args.responseMs,
      reviewedAt: nowIso,
    },
  ];

  const sessions = snap.sessions.map((s) =>
    s.id === args.sessionId
      ? {
          ...s,
          cardsReviewed: s.cardsReviewed + 1,
          cardsCorrect: s.cardsCorrect + (correct ? 1 : 0),
          xpEarned: s.xpEarned + xpEarned,
        }
      : s,
  );

  const decks = snap.decks.map((d) =>
    d.id === args.deckId ? { ...d, lastStudiedAt: nowIso } : d,
  );

  // Stats + streak
  const tk = todayKey(now);
  const stats = { ...snap.stats };
  stats.totalReviews += 1;
  stats.totalCorrect += correct ? 1 : 0;
  stats.totalXp += xpEarned;

  const daily = [...stats.daily];
  const idx = daily.findIndex((d) => d.date === tk);
  if (idx >= 0) {
    daily[idx] = {
      ...daily[idx],
      reviewed: daily[idx].reviewed + 1,
      correct: daily[idx].correct + (correct ? 1 : 0),
      xp: daily[idx].xp + xpEarned,
    };
  } else {
    daily.push({ date: tk, reviewed: 1, correct: correct ? 1 : 0, xp: xpEarned });
  }
  stats.daily = daily.slice(-30);

  // Streak: advance if this is a new day adjacent to the last study day.
  if (stats.lastStudyDate !== tk) {
    const last = stats.lastStudyDate ? new Date(stats.lastStudyDate + "T00:00:00") : null;
    const gap = last
      ? Math.round((new Date(tk + "T00:00:00").getTime() - last.getTime()) / 86_400_000)
      : 1;
    stats.currentStreak = gap === 1 ? stats.currentStreak + 1 : 1;
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastStudyDate = tk;
  }

  const session = sessions.find((s) => s.id === args.sessionId);
  const ctx: AchievementContext = {
    deckCount: decks.length,
    sessionCount: sessions.length,
    lastSessionReviewed: session?.cardsReviewed ?? 0,
    lastSessionCorrect: session?.cardsCorrect ?? 0,
    studiedAfterMidnight: now.getHours() >= 0 && now.getHours() < 5,
  };
  const earned = evaluateAchievements(stats, ctx);
  if (earned.length) {
    stats.unlocked = [
      ...stats.unlocked,
      ...earned.map((id) => ({ id, unlockedAt: nowIso })),
    ];
  }

  return {
    snapshot: { ...snap, cards, reviews, sessions, decks, stats },
    xpEarned,
    correct,
    newAchievements: earned,
    streak: stats.currentStreak,
    totalXp: stats.totalXp,
  };
}

export function endSession(snap: DatabaseSnapshot, sessionId: string): DatabaseSnapshot {
  return {
    ...snap,
    sessions: snap.sessions.map((s) =>
      s.id === sessionId && !s.endedAt ? { ...s, endedAt: new Date().toISOString() } : s,
    ),
  };
}

/* ------------------------------------------------------------------ */
/*  Aggregate dashboard selectors                                      */
/* ------------------------------------------------------------------ */

export function todayStat(snap: DatabaseSnapshot) {
  const tk = todayKey();
  const d = snap.stats.daily.find((x) => x.date === tk);
  return d ?? { date: tk, reviewed: 0, correct: 0, xp: 0 };
}

export function weeklyStats(snap: DatabaseSnapshot) {
  const out: { date: string; reviewed: number; correct: number; xp: number }[] = [];
  const base = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 86_400_000);
    const key = todayKey(d);
    const hit = snap.stats.daily.find((x) => x.date === key);
    out.push(hit ?? { date: key, reviewed: 0, correct: 0, xp: 0 });
  }
  return out;
}

export function overallMastery(snap: DatabaseSnapshot): number {
  if (snap.cards.length === 0) return 0;
  return deckMastery(snap.cards);
}

export function unlockedAchievementDefs(snap: DatabaseSnapshot) {
  return snap.stats.unlocked
    .map((u) => ({ ...ACHIEVEMENT_MAP[u.id], unlockedAt: u.unlockedAt }))
    .filter((x) => x.id);
}
