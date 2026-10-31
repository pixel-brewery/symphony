// #region Imports

import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IPullRequestStateCounts } from './IPullRequestStateCounts';

// #endregion

/** Combined state of a pull request's checks, as the Pull requests screen summarises them. */
type ChecksState = 'none' | 'failing' | 'running' | 'passed' | 'cancelled';

/**
 * Counts the open pull requests by the rules of the Pull requests screen, so both show the same
 * numbers: each workflow's newest run on the pull request's branch is one check (a newer local
 * run of it wins); a failing check makes the checks fail, otherwise a queued or running one makes
 * them run, and they pass when every check succeeded. A pull request is ready to merge when it is
 * not a draft, its branch is current with its base and every check passed — Symphony reads no
 * approvals. A pull request waits for the user's review when one of the scope's signed-in GitHub
 * logins is among its pending requested reviewers (logins compare case-insensitively; team
 * requests are not attributed to a person).
 *
 * @param pullRequests - Pull requests of the active scope.
 * @param runs - Cached workflow runs of the active scope.
 * @param localExecutions - Local runs of those workflows.
 * @param viewerLogins - Lower-cased GitHub logins the scope is signed in with; empty when unknown.
 * @returns The counts the Overview's `Pull requests` card shows.
 * @public
 */
export function projectPullRequestStates(
  pullRequests: readonly IPullRequestSummary[],
  runs: readonly ICiRun[],
  localExecutions: readonly ILocalCiExecution[],
  viewerLogins: ReadonlySet<string> = new Set(),
): IPullRequestStateCounts {
  const open = pullRequests.filter((pullRequest) => pullRequest.state === 'open');
  const checks = open.map((pullRequest) => ({
    pullRequest,
    state: checksState(pullRequest, runs, localExecutions),
  }));
  return {
    open: open.length,
    ...(viewerLogins.size
      ? {
          waitingForReview: open.filter((pullRequest) =>
            (pullRequest.requestedReviewers ?? []).some((login) =>
              viewerLogins.has(login.toLocaleLowerCase()),
            ),
          ).length,
        }
      : {}),
    checksFailing: checks.filter((entry) => entry.state === 'failing').length,
    readyToMerge: checks.filter(
      (entry) =>
        !entry.pullRequest.draft &&
        entry.pullRequest.baseBranchStatus === 'current' &&
        entry.state === 'passed',
    ).length,
    checksRunning: checks.filter((entry) => entry.state === 'running').length,
    drafts: open.filter((pullRequest) => pullRequest.draft).length,
  };
}

function checksState(
  pullRequest: IPullRequestSummary,
  runs: readonly ICiRun[],
  localExecutions: readonly ILocalCiExecution[],
): ChecksState {
  const latestByWorkflow = new Map<string, ICiRun>();
  for (const run of runs
    .filter(
      (candidate) =>
        candidate.repositoryBindingId === pullRequest.repositoryBindingId &&
        candidate.branch === pullRequest.sourceBranch,
    )
    .toSorted((left, right) => runTime(right).localeCompare(runTime(left)))) {
    const key = run.workflowId ?? run.name;
    if (!latestByWorkflow.has(key)) latestByWorkflow.set(key, run);
  }
  const states = [...latestByWorkflow.values()].map((run) => {
    const local = localExecutions
      .filter((execution) => execution.ciRunId === run.id)
      .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
    return local && local.startedAt > (run.startedAt ?? '') ? local.state : run.status;
  });
  if (!states.length) return 'none';
  if (states.includes('failed')) return 'failing';
  if (states.some((state) => state === 'queued' || state === 'in-progress')) return 'running';
  return states.every((state) => state === 'succeeded') ? 'passed' : 'cancelled';
}

function runTime(run: ICiRun): string {
  return run.startedAt ?? run.finishedAt ?? '';
}
