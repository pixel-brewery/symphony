/**
 * File names that carry local credentials or machine secrets. These are excluded even when
 * a repository tracks or fails to ignore them.
 */
export const worktreeSnapshotExcludedFileNames = [
  '.env.local',
  '.env.development.local',
  '.env.production.local',
  '.env.test.local',
  '.netrc',
  '.npmrc',
  '.git-credentials',
] as const;
