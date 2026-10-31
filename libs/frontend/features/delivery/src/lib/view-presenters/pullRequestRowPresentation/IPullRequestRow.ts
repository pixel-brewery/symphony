// #region Imports

import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IPullRequestCheck } from './IPullRequestCheck';
import type { IPullRequestChecksSummary } from './IPullRequestChecksSummary';
import type { IPullRequestDelivery } from './IPullRequestDelivery';
import type { PullRequestMergeState } from './PullRequestMergeState';

// #endregion

/**
 * One pull request with the facts the list and the inspector show for it.
 *
 * @public
 */
export interface IPullRequestRow {
  /** The pull request. */
  readonly pullRequest: IPullRequestSummary;
  /** Newest result of each workflow on its branch, failures first. */
  readonly checks: readonly IPullRequestCheck[];
  /** Combined state of those checks. */
  readonly checksSummary: IPullRequestChecksSummary;
  /** Whether it can be merged as far as Symphony knows. */
  readonly mergeState: PullRequestMergeState;
  /** The delivery behind it. */
  readonly delivery: IPullRequestDelivery;
  /** Whether someone has to act: failing checks, a conflict or a branch behind its base. */
  readonly needsAction: boolean;
}
