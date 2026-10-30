/**
 * Directories that are always rebuilt inside the VM and must never leave the host.
 * Playwright reports and test results are excluded so an older local run can never be
 * mistaken for the evidence of this run.
 */
export const worktreeSnapshotExcludedDirectories = [
  '.git',
  '.gnupg',
  '.nx/cache',
  '.nx/workspace-data',
  '.ssh',
  '.yarn/install-state.gz',
  'blob-storage',
  'dist',
  'node_modules',
  'out',
  'output',
  'playwright-report',
  'test-results',
  'tmp',
] as const;
