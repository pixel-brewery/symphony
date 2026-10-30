// #region Imports

import { worktreeSnapshotExcludedDirectories } from './WorktreeSnapshotExcludedDirectories';
import { worktreeSnapshotExcludedFileNames } from './WorktreeSnapshotExcludedFileNames';

// #endregion

/** True when a repository-relative path must never be transferred into the VM. */
export function isExcluded(relativePath: string): boolean {
  const segments = relativePath.split('/');
  const fileName = segments.at(-1) ?? '';
  if (worktreeSnapshotExcludedFileNames.some((candidate) => candidate === fileName)) return true;
  if (excludedFileSuffixes.some((suffix) => fileName.endsWith(suffix))) return true;
  for (const excluded of worktreeSnapshotExcludedDirectories) {
    const excludedSegments = excluded.split('/');
    if (
      segments.length >= excludedSegments.length &&
      excludedSegments.every((segment, index) => segments[index] === segment)
    ) {
      return true;
    }
    // Reject nested occurrences such as `apps/web/node_modules/left-pad/index.js`.
    if (excludedSegments.length === 1 && segments.slice(0, -1).includes(excluded)) return true;
  }
  return false;
}

const excludedFileSuffixes = ['.pem', '.key', '.p12', '.pfx', '.keystore', '.jks', '.asc'] as const;
