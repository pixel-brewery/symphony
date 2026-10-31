// #region Imports

import { sep } from 'node:path';
import { lstatSync } from 'node:fs';

// #endregion

/** Rejects a worktree path that escapes its repository binding or is not a directory. */
export function assertWorktreePath(worktreePath: string): void {
  if (!worktreePath.startsWith(sep)) {
    throw new Error('The worktree path must be absolute.');
  }
  if (worktreePath.includes('\0')) {
    throw new Error('The worktree path is invalid.');
  }
  const stat = lstatSync(worktreePath);
  if (!stat.isDirectory()) {
    throw new Error('The worktree path is not a directory.');
  }
}
