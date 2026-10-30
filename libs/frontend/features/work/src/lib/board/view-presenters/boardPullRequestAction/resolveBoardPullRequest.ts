// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IBoardPullRequestContext } from './IBoardPullRequestContext';

// #endregion

/**
 * The delivered pull request of a work item.
 *
 * The reference comes from the execution that delivered it, because that is what proves the
 * delivery happened; the summary is the same projection the pull-request page lists. The workflow
 * run is added by the caller with the resolver both surfaces share, so a card and the pull-request
 * page always act on the same run.
 */
export function resolveBoardPullRequest(
  executions: readonly IExecutionRecord[],
  pullRequests: readonly IPullRequestSummary[],
): IBoardPullRequestContext | undefined {
  const delivered = executions
    .filter(
      (execution) =>
        execution.pullRequest &&
        (execution.kind === 'solution' || execution.kind === 'revision' || !execution.kind),
    )
    .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
  const reference = delivered?.pullRequest;
  if (!reference) return undefined;
  const summary = pullRequests.find((candidate) => candidate.externalUrl === reference.externalUrl);
  return { reference, ...(summary ? { summary } : {}) };
}
