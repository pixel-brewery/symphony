// #region Imports

import type { IPullRequestCheck } from './IPullRequestCheck';
import type { IPullRequestChecksSummary } from './IPullRequestChecksSummary';
import type { PullRequestChecksState } from './PullRequestChecksState';

// #endregion

/**
 * Combines a pull request's checks into one state. A failure outweighs checks that still run, and
 * only checks that all succeeded count as passed.
 *
 * @param checks - Checks.
 * @returns The combined state and its counts.
 * @public
 */
export function summarizePullRequestChecks(
  checks: readonly Pick<IPullRequestCheck, 'state' | 'run'>[],
): IPullRequestChecksSummary {
  const failingNames = checks
    .filter((check) => check.state === 'failed')
    .map((check) => check.run.name);
  return {
    state: combinedState(checks, failingNames.length),
    failing: failingNames.length,
    failingNames,
    total: checks.length,
  };
}

function combinedState(
  checks: readonly Pick<IPullRequestCheck, 'state'>[],
  failing: number,
): PullRequestChecksState {
  if (!checks.length) return 'none';
  if (failing) return 'failing';
  if (checks.some((check) => check.state === 'queued' || check.state === 'in-progress')) {
    return 'running';
  }
  return checks.every((check) => check.state === 'succeeded') ? 'passed' : 'cancelled';
}
