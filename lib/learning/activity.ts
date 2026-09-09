/**
 * A single unified activity feed across every learning system.
 *
 * Reads the existing logs — `snap.activities` (materials / decks / quizzes) and
 * `snap.languageActivities` (languages / conversations) — and maps them into
 * one sorted stream for the Hub's "Recent Progress" section. Nothing new is
 * stored; this is a read-only projection.
 */

import type { DatabaseSnapshot, LearningActivity } from "@/lib/types";
import type { LanguageActivity } from "@/lib/language/types";
import type { UnifiedActivity, UnifiedActivityKind } from "@/lib/learning/types";
import { getLanguage } from "@/lib/language/catalog";

function materialName(snap: DatabaseSnapshot, id: string | null | undefined): string {
  if (!id) return "";
  return snap.materials.find((m) => m.id === id)?.name ?? "";
}
function deckName(snap: DatabaseSnapshot, id: string | null | undefined): string {
  if (!id) return "";
  return snap.decks.find((d) => d.id === id)?.name ?? "";
}

function fromLearningActivity(
  snap: DatabaseSnapshot,
  a: LearningActivity,
): UnifiedActivity | null {
  const mName = materialName(snap, a.materialId);
  const dName = deckName(snap, a.deckId);
  const label = mName || dName;

  const map: Partial<
    Record<
      LearningActivity["type"],
      { kind: UnifiedActivityKind; icon: string; title: string; detail: string }
    >
  > = {
    "material-added": {
      kind: "material-added",
      icon: "📄",
      title: "Added study material",
      detail: a.detail ?? label,
    },
    "flashcards-created": {
      kind: "other",
      icon: "🃏",
      title: "Created flashcards",
      detail: label || (a.detail ?? ""),
    },
    "quiz-created": {
      kind: "other",
      icon: "📝",
      title: "Created a quiz",
      detail: label || (a.detail ?? ""),
    },
    "guide-created": {
      kind: "other",
      icon: "📘",
      title: "Created a study guide",
      detail: label || (a.detail ?? ""),
    },
    "summary-created": {
      kind: "other",
      icon: "📋",
      title: "Created a summary",
      detail: label || (a.detail ?? ""),
    },
    "flashcard-session": {
      kind: "flashcards-reviewed",
      icon: "🔁",
      title: label ? `Reviewed ${label}` : "Reviewed flashcards",
      detail:
        a.reviewed != null
          ? `${a.reviewed} cards · ${a.accuracy ?? 0}%${a.xpEarned ? ` · +${a.xpEarned} XP` : ""}`
          : (a.detail ?? ""),
    },
    "quiz-attempt": {
      kind:
        a.masteryAfter != null &&
        a.masteryBefore != null &&
        a.masteryAfter > a.masteryBefore
          ? "quiz-improved"
          : "quiz-completed",
      icon: "✅",
      title: label ? `Quiz — ${label}` : "Completed a quiz",
      detail: a.detail ?? (a.accuracy != null ? `${a.accuracy}%` : ""),
    },
  };

  const m = map[a.type];
  if (!m) return null;
  return {
    id: a.id,
    at: a.at,
    kind: m.kind,
    icon: m.icon,
    title: m.title,
    detail: m.detail,
    sourceType: a.materialId ? "material" : a.deckId ? "deck" : undefined,
    sourceId: a.materialId ?? a.deckId ?? undefined,
  };
}

function fromLanguageActivity(a: LanguageActivity): UnifiedActivity | null {
  const langName = getLanguage(a.languageId)?.name ?? "language";
  switch (a.type) {
    case "session-completed":
      return {
        id: a.id,
        at: a.at,
        kind: "language-session",
        icon: "🗣️",
        title: `${langName} session`,
        detail:
          a.reviewed != null
            ? `${a.reviewed} items · ${a.accuracy ?? 0}%${a.xpEarned ? ` · +${a.xpEarned} XP` : ""}`
            : (a.detail ?? ""),
        sourceType: "language",
        sourceId: a.profileId,
      };
    case "conversation-completed":
      return {
        id: a.id,
        at: a.at,
        kind: "conversation-completed",
        icon: "💬",
        title: `${langName} conversation`,
        detail: a.detail ?? "",
        sourceType: "language",
        sourceId: a.profileId,
      };
    case "challenge-completed":
      return {
        id: a.id,
        at: a.at,
        kind: "language-practiced",
        icon: "🎯",
        title: `${langName} challenge`,
        detail: a.detail ?? "",
        sourceType: "language",
        sourceId: a.profileId,
      };
    case "vocab-added":
      return {
        id: a.id,
        at: a.at,
        kind: "other",
        icon: "➕",
        title: `Added ${langName} vocabulary`,
        detail: a.detail ?? "",
        sourceType: "language",
        sourceId: a.profileId,
      };
    case "language-added":
      return {
        id: a.id,
        at: a.at,
        kind: "other",
        icon: getLanguage(a.languageId)?.flag ?? "🌐",
        title: `Started ${langName}`,
        detail: "",
        sourceType: "language",
        sourceId: a.profileId,
      };
    default:
      return null;
  }
}

/** The whole unified stream, newest first. */
export function unifiedActivity(
  snap: DatabaseSnapshot,
  limit = 12,
): UnifiedActivity[] {
  const items: UnifiedActivity[] = [];
  for (const a of snap.activities) {
    const u = fromLearningActivity(snap, a);
    if (u) items.push(u);
  }
  for (const a of snap.languageActivities) {
    const u = fromLanguageActivity(a);
    if (u) items.push(u);
  }
  return items
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, limit);
}

/** "Meaningful" progress only — used by the Hub's Recent Progress section. */
export function recentProgress(
  snap: DatabaseSnapshot,
  limit = 6,
): UnifiedActivity[] {
  const meaningful: UnifiedActivityKind[] = [
    "flashcards-reviewed",
    "quiz-completed",
    "quiz-improved",
    "language-session",
    "conversation-completed",
    "language-practiced",
    "material-added",
  ];
  return unifiedActivity(snap, 40)
    .filter((a) => meaningful.includes(a.kind))
    .slice(0, limit);
}
