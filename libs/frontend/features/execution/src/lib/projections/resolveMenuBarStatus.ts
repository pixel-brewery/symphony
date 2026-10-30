// #region Imports

import type { IRailRun } from './IRailRun';

// #endregion

/** Resolves the single status the native menu-bar mark can communicate. */
export function resolveMenuBarStatus(runs: readonly IRailRun[]): 'idle' | 'running' | 'failed' {
  if (runs.some((run) => run.active)) return 'running';
  const latestCompleted = runs.find(
    (run) => !['in-progress', 'queued', 'running', 'waiting', 'paused'].includes(run.state),
  );
  if (
    latestCompleted?.state === 'failed' ||
    latestCompleted?.sources?.some((source) => source.state === 'failed')
  ) {
    return 'failed';
  }
  return 'idle';
}
