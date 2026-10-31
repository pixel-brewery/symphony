// #region Imports

import type { IPullRequestStatus } from '@symphony/domain-delivery';

// #endregion

/**
 * Last-observed base qualification of one managed pull request.
 *
 * @public
 */
export interface IPullRequestQualification {
  /** Security and ownership boundary of the delivery that owns the pull request. */
  workspaceId: string;
  pullRequestNumber: number;
  /** Work item of the delivery execution whose inspection produced this observation. */
  workItemId: string;
  /** Provider-neutral relationship between the pull-request head and its configured base. */
  baseBranchStatus: IPullRequestStatus['baseBranchStatus'];
  observedAt: string;
}
