/**
 * Storage layer — the seam between the app and where data actually lives.
 *
 * Today the only adapter is `LocalStorageAdapter` (browser localStorage, one
 * workspace per device). The app talks to a `SnapshotRepository`, never to
 * localStorage directly, so a future `SupabaseAdapter` (authenticated, multi
 * device) can be dropped in without touching a single feature.
 *
 * There is NO seed / demo data anywhere in this layer. A brand-new workspace is
 * `emptySnapshot()` — zero decks, zero XP, zero streak.
 */

import type { DatabaseSnapshot } from "@/lib/types";

/**
 * Bump when the persisted shape changes in a way older data can't satisfy.
 * `migrate()` in `local-store.ts` decides whether old data is upgraded in place
 * or retired to a fresh empty workspace.
 *
 * History:
 *  - 11 and earlier: development builds that shipped a demo workspace. Retired.
 *  - 12: first "real users" schema — empty by default, no seed data.
 */
export const SCHEMA_VERSION = 12;

/** Where a persisted workspace can come from — used for honest UI messaging. */
export type StorageKind = "local" | "cloud";

export interface StorageAdapter {
  readonly kind: StorageKind;
  /** Human label for settings/UI, e.g. "this browser" or "your account". */
  readonly label: string;
  /** True when the backing store is shared across devices for a signed-in user. */
  readonly isMultiDevice: boolean;

  /** Return the stored workspace, or `null` if none exists yet. */
  load(): DatabaseSnapshot | null;
  /** Persist the workspace. */
  save(snapshot: DatabaseSnapshot): void;
  /** Remove the stored workspace entirely (next load starts fresh). */
  clear(): void;
}
