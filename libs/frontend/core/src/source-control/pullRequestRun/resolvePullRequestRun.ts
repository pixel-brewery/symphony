// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { runTimestamp } from './runTimestamp';

// #endregion

/** Resolves the most recent workflow run for the pull request's source branch. */
export function resolvePullRequestRun(
  pullRequest: IPullRequestSummary,
  runs: readonly ICiRun[],
): ICiRun | undefined {
  return runs
    .filter(
      (run) =>
        run.repositoryBindingId === pullRequest.repositoryBindingId &&
        run.branch === pullRequest.sourceBranch,
    )
    .toSorted((left, right) => runTimestamp(right).localeCompare(runTimestamp(left)))[0];
}
