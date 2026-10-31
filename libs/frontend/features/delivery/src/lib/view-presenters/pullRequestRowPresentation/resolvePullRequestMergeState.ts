// #region Imports

import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { PullRequestChecksState } from './PullRequestChecksState';
import type { PullRequestMergeState } from './PullRequestMergeState';

// #endregion

/**
 * Resolves whether a pull request can be merged as far as Symphony knows. A draft cannot be merged
 * whatever its branch says; a mergeable branch whose checks all passed is ready.
 *
 * @param pullRequest - Pull request.
 * @param checks - Combined state of its checks.
 * @returns The merge state.
 * @public
 */
export function resolvePullRequestMergeState(
  pullRequest: Pick<IPullRequestSummary, 'state' | 'draft' | 'baseBranchStatus'>,
  checks: PullRequestChecksState,
): PullRequestMergeState {
  if (pullRequest.state !== 'open') return pullRequest.state;
  if (pullRequest.draft) return 'draft';
  switch (pullRequest.baseBranchStatus) {
    case 'conflicting':
      return 'conflict';
    case 'behind':
      return 'behind';
    case 'current':
      return checks === 'passed' ? 'ready' : 'mergeable';
    case 'unknown':
    case undefined:
      return 'unknown';
  }
}
