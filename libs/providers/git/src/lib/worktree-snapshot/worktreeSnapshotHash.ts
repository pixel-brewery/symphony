// #region Imports

import { createHash } from 'node:crypto';
import type { IWorktreeSnapshotEntry } from './IWorktreeSnapshotEntry';

// #endregion

/** Stable hash of a snapshot: content, mode, and path, independent of archive metadata. */
export function worktreeSnapshotHash(
  headCommit: string,
  entries: readonly IWorktreeSnapshotEntry[],
): string {
  const digest = createHash('sha256');
  digest.update(`head:${headCommit}\n`);
  for (const entry of entries) {
    digest.update(`${entry.mode}\0${entry.path}\0${entry.contentHash}\n`);
  }
  return digest.digest('hex');
}
