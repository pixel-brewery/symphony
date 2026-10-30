// #region Imports

import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { PullRequestState } from './PullRequestState';

// #endregion

/**
 * The state a pull request is listed under. A draft is reported as a draft whatever the provider
 * says about it being open, because a draft is not a request for review.
 *
 * @param pullRequest - Pull request.
 * @public
 */
export function pullRequestStateOf(
  pullRequest: Pick<IPullRequestSummary, 'draft' | 'state'>,
): PullRequestState {
  if (pullRequest.state === 'open') return pullRequest.draft ? 'draft' : 'open';
  return pullRequest.state;
}
