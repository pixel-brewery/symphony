// #region Imports

import type {
  IPullRequestBranchInventory,
  IPullRequestComparison,
  IPullRequestDraft,
  IPullRequestSummary,
} from '@symphony/domain-delivery';

// #endregion

/**
 * Opens pull requests an operator authors directly, outside execution delivery.
 *
 * @public
 */
export interface IPullRequestAuthoringPort {
  listBranches(repositoryBindingId: string): Promise<IPullRequestBranchInventory>;
  compareBranches(
    repositoryBindingId: string,
    targetBranch: string,
    sourceBranch: string,
  ): Promise<IPullRequestComparison>;
  createPullRequest(draft: IPullRequestDraft): Promise<IPullRequestSummary>;
}
