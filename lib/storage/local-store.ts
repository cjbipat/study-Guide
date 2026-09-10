/**
 * Browser-localStorage adapter — one learning workspace per browser profile.
 *
 * This is honest about its limits: data lives in *this* browser only. It does
 * not provide accounts, and it does not sync across devices. See
 * `repository.ts` for the app-facing API and the migration path to cloud
 * storage.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import { SCHEMA_VERSION, type StorageAdapter } from "@/lib/storage/types";

const STORAGE_KEY = "studyquest.snapshot.v3";
/** Legacy display-name preference, written by the old sign-up screen. */
const NAME_KEY = "studyquest.name";

const ARRAY_FIELDS: (keyof DatabaseSnapshot)[] = [
  "decks",
  "cards",
  "materials",
  "learningItems",
  "activities",
  "goals",
  "reviews",
  "sessions",
  "languages",
  "vocab",
  "languageReviews",
  "languageSessions",
  "languageActivities",
  "pronunciationAttempts",
  "languageGoals",
  "conversationSessions",
  "quizzes",
  "quizAttempts",
];

function readName(): string | null {
  try {
    const n = window.localStorage.getItem(NAME_KEY);
    return n && n.trim() ? n.trim() : null;
  } catch {
    return null;
  }
}

/** Apply the saved display-name preference over whatever the snapshot carries. */
export function applyNameOverride(snap: DatabaseSnapshot): DatabaseSnapshot {
  if (typeof window === "undefined") return snap;
  const name = readName();
  if (name && name !== snap.user.name) {
    return { ...snap, user: { ...snap.user, name } };
  }
  return snap;
}

/**
 * Bring a persisted snapshot up to the current schema.
 *
 * Returns `null` when the stored data cannot be carried forward — the caller
 * then starts a fresh empty workspace. Versions 11 and earlier were the
 * development builds that shipped a demo workspace; those are intentionally
 * retired so no one is left staring at fake streaks and pre-loaded decks.
 */
export function migrate(parsed: unknown): DatabaseSnapshot | null {
  if (!parsed || typeof parsed !== "object") return null;
  const snap = parsed as Partial<DatabaseSnapshot> & { version?: number };

  if (typeof snap.version !== "number") return null;

  // Demo-era data — do not carry forward.
  if (snap.version < 12) return null;

  // Current schema: repair any missing collections, keep everything real.
  if (snap.version === SCHEMA_VERSION) {
    if (!snap.user || typeof snap.user !== "object") return null;
    if (!snap.stats || typeof snap.stats !== "object") return null;
    const record = snap as unknown as Record<string, unknown>;
    for (const field of ARRAY_FIELDS) {
      if (!Array.isArray(record[field])) record[field] = [];
    }
    return snap as DatabaseSnapshot;
  }

  // Newer than we understand (e.g. opened an older build) — don't touch it,
  // but don't crash either.
  if (snap.version > SCHEMA_VERSION) {
    return null;
  }

  return null;
}

export class LocalStorageAdapter implements StorageAdapter {
  readonly kind = "local" as const;
  readonly label = "this browser";
  readonly isMultiDevice = false;

  load(): DatabaseSnapshot | null {
    if (typeof window === "undefined") return null;
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    const migrated = migrate(parsed);
    if (!migrated) {
      // Unusable / demo-era data — clear it so we don't keep re-parsing it.
      this.clear();
      return null;
    }
    return applyNameOverride(migrated);
  }

  save(snapshot: DatabaseSnapshot): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota exceeded / private mode — the app keeps working in memory */
    }
  }

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
