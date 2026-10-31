// #region Imports

import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IActiveLocalPullRequestRun } from '@symphony/frontend-core';
import type { IPullRequestCheck } from './IPullRequestCheck';

// #endregion

const STATE_ORDER: Readonly<Record<ICiRun['status'], number>> = {
  failed: 0,
  'in-progress': 1,
  queued: 2,
  cancelled: 3,
  succeeded: 4,
};

/**
 * Resolves the checks of a pull request: the newest run of each workflow on its source branch, each
 * with the newest result from GitHub or the local runner. Failures come first, then running and
 * queued checks, then the rest, each group by name.
 *
 * @param pullRequest - Pull request.
 * @param runs - Workflow runs in scope.
 * @param localExecutions - Local-runner executions in scope.
 * @param activeLocalRun - The run the local runner is executing right now.
 * @returns The checks.
 * @public
 */
export function resolvePullRequestChecks(
  pullRequest: Pick<IPullRequestSummary, 'repositoryBindingId' | 'sourceBranch'>,
  runs: readonly ICiRun[],
  localExecutions: readonly ILocalCiExecution[],
  activeLocalRun?: IActiveLocalPullRequestRun,
): readonly IPullRequestCheck[] {
  const newestFirst = runs
    .filter(
      (run) =>
        run.repositoryBindingId === pullRequest.repositoryBindingId &&
        run.branch === pullRequest.sourceBranch,
    )
    .toSorted((left, right) => timestamp(right).localeCompare(timestamp(left)));
  const latestByWorkflow = new Map<string, ICiRun>();
  for (const run of newestFirst) {
    const key = run.workflowId ?? run.name;
    if (!latestByWorkflow.has(key)) latestByWorkflow.set(key, run);
  }
  return [...latestByWorkflow.values()]
    .map((run) => newestResult(run, localExecutions, activeLocalRun))
    .toSorted(
      (left, right) =>
        STATE_ORDER[left.state] - STATE_ORDER[right.state] ||
        left.run.name.localeCompare(right.run.name),
    );
}

function newestResult(
  run: ICiRun,
  localExecutions: readonly ILocalCiExecution[],
  activeLocalRun: IActiveLocalPullRequestRun | undefined,
): IPullRequestCheck {
  const candidates: IPullRequestCheck[] = [
    {
      run,
      source: 'cloud',
      state: run.status,
      ...(run.startedAt ? { startedAt: run.startedAt } : {}),
      ...(run.finishedAt ? { finishedAt: run.finishedAt } : {}),
    },
    ...localExecutions
      .filter((execution) => execution.ciRunId === run.id)
      .map((execution): IPullRequestCheck => ({
        run,
        source: 'local',
        state: execution.state,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
      })),
    ...(activeLocalRun?.runId === run.id
      ? [
          {
            run,
            source: 'local',
            state: 'in-progress',
            startedAt: activeLocalRun.startedAt,
          } satisfies IPullRequestCheck,
        ]
      : []),
  ];
  return candidates.toSorted((left, right) =>
    (right.startedAt ?? '').localeCompare(left.startedAt ?? ''),
  )[0]!;
}

function timestamp(run: ICiRun): string {
  return run.startedAt ?? run.finishedAt ?? '';
}
