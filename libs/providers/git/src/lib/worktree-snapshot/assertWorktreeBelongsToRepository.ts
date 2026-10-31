// #region Imports

import type { IWorktreeRepositoryIdentity } from './IWorktreeRepositoryIdentity';
import type { IWorktreeSnapshotOptions } from './IWorktreeSnapshotOptions';
import { defaultExecute } from './defaultExecute';
import { normalizedRemote } from './normalizedRemote';

// #endregion

/**
 * Verifies that a worktree really belongs to the repository binding a run was authorised for.
 * Without this a caller could point a prepared binding at any directory on the Mac.
 */
export async function assertWorktreeBelongsToRepository(
  worktreePath: string,
  repository: IWorktreeRepositoryIdentity,
  signal: AbortSignal,
  execute: IWorktreeSnapshotOptions['execute'] = defaultExecute,
): Promise<void> {
  const remote = (
    await execute('git', ['remote', 'get-url', 'origin'], worktreePath, signal).catch(() => '')
  ).trim();
  if (!remote) {
    throw new Error('The worktree has no origin remote to verify against the binding.');
  }
  const expected = `${repository.host}/${repository.owner}/${repository.name}`.toLowerCase();
  if (normalizedRemote(remote) !== expected) {
    throw new Error(`The worktree belongs to a different repository than ${expected}.`);
  }
}
