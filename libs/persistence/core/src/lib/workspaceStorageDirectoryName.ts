// #region Imports

import { createHash } from 'node:crypto';

// #endregion

/**
 * Returns the stable, filesystem-safe directory name for one workspace boundary.
 *
 * @param workspaceId - Immutable workspace boundary.
 * @returns Its existing readable name and collision-resistant suffix.
 * @public
 */
export function workspaceStorageDirectoryName(workspaceId: string): string {
  const readable = workspaceId
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 32);
  const digest = createHash('sha256').update(workspaceId).digest('hex').slice(0, 12);
  return `${readable || 'workspace'}-${digest}`;
}
