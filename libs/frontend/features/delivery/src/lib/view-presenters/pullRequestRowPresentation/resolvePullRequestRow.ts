// #region Imports

import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IPullRequestCheck } from './IPullRequestCheck';
import type { IPullRequestDelivery } from './IPullRequestDelivery';
import type { IPullRequestRow } from './IPullRequestRow';
import { resolvePullRequestMergeState } from './resolvePullRequestMergeState';
import { summarizePullRequestChecks } from './summarizePullRequestChecks';

// #endregion

/**
 * Assembles one row of the pull-request list from its checks and its delivery.
 *
 * @param pullRequest - Pull request.
 * @param checks - Its checks.
 * @param delivery - The delivery behind it.
 * @returns The row.
 * @public
 */
export function resolvePullRequestRow(
  pullRequest: IPullRequestSummary,
  checks: readonly IPullRequestCheck[],
  delivery: IPullRequestDelivery,
): IPullRequestRow {
  const checksSummary = summarizePullRequestChecks(checks);
  const mergeState = resolvePullRequestMergeState(pullRequest, checksSummary.state);
  return {
    pullRequest,
    checks,
    checksSummary,
    mergeState,
    delivery,
    needsAction:
      checksSummary.state === 'failing' || mergeState === 'conflict' || mergeState === 'behind',
  };
}
