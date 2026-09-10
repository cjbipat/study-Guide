/**
 * SnapshotRepository — the app's single door to persistence.
 *
 * Every feature reads and writes the workspace through this object. It is bound
 * to one `StorageAdapter` (today: localStorage). Swapping in an authenticated
 * cloud adapter later is a one-line change here and nothing else.
 */

import type { DatabaseSnapshot } from "@/lib/types";
import type { StorageAdapter } from "@/lib/storage/types";
import { LocalStorageAdapter, applyNameOverride } from "@/lib/storage/local-store";
import { emptySnapshot } from "@/lib/storage/empty";

export class SnapshotRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  get storageKind() {
    return this.adapter.kind;
  }
  get storageLabel() {
    return this.adapter.label;
  }
  get isMultiDevice() {
    return this.adapter.isMultiDevice;
  }

  /**
   * Load the current workspace. If none exists (new user, or demo-era data that
   * was retired), create and persist a fresh empty workspace.
   */
  load(): DatabaseSnapshot {
    const existing = this.adapter.load();
    if (existing) return existing;
    const fresh = this.adapter.kind === "local" ? applyNameOverride(emptySnapshot()) : emptySnapshot();
    this.adapter.save(fresh);
    return fresh;
  }

  save(snapshot: DatabaseSnapshot): void {
    this.adapter.save(snapshot);
  }

  /**
   * Wipe the workspace back to empty. This is a deliberate, user-initiated
   * action (Settings → "Clear all my data"). It never runs on ordinary startup.
   */
  reset(opts?: { name?: string }): DatabaseSnapshot {
    const base = emptySnapshot(opts);
    const fresh =
      this.adapter.kind === "local" && !opts?.name
        ? applyNameOverride(base)
        : base;
    this.adapter.save(fresh);
    return fresh;
  }
}

/** The repository the running app uses. */
export const repository = new SnapshotRepository(new LocalStorageAdapter());
