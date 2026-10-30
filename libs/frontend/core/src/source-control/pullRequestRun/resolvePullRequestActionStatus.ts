// #region Imports

import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IActiveLocalPullRequestRun } from './IActiveLocalPullRequestRun';
import type { IPullRequestActionStatus } from './IPullRequestActionStatus';
import { runTimestamp } from './runTimestamp';

// #endregion

/** Resolves the newest local or cloud Action state visible for one pull request. */
export function resolvePullRequestActionStatus(
  pullRequest: IPullRequestSummary,
  runs: readonly ICiRun[],
  localExecutions: readonly ILocalCiExecution[],
  activeLocalRun?: IActiveLocalPullRequestRun,
): IPullRequestActionStatus | undefined {
  const matchingRuns = runs.filter(
    (run) =>
      run.repositoryBindingId === pullRequest.repositoryBindingId &&
      run.branch === pullRequest.sourceBranch,
  );
  const runsById = new Map(matchingRuns.map((run) => [run.id, run]));
  const candidates: IPullRequestActionStatus[] = matchingRuns.map((run) => ({
    run,
    source: 'cloud',
    state: run.status,
    active: run.status === 'in-progress',
    startedAt: runTimestamp(run),
  }));

  for (const execution of localExecutions) {
    const run = runsById.get(execution.ciRunId);
    if (!run) continue;
    candidates.push({
      run,
      source: 'local',
      state: execution.state,
      active: false,
      startedAt: execution.startedAt,
    });
  }

  if (activeLocalRun) {
    const run = runsById.get(activeLocalRun.runId);
    if (run) {
      candidates.push({
        run,
        source: 'local',
        state: 'in-progress',
        active: true,
        startedAt: activeLocalRun.startedAt,
      });
    }
  }

  return candidates.toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
}
