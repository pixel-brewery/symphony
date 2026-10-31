// #region Imports

import type { Signal } from '@angular/core';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';
import type {
  PullRequestBranchInventoryDto,
  PullRequestComparisonDto,
  PullRequestSummaryDto,
} from '@symphony/ipc-contracts-delivery';

// #endregion

/** The existing Delivery operations consumed by the remaining composition surfaces. @public */
export interface IDeliveryOperations {
  readonly pullRequestBusy: Signal<boolean>;
  readonly pullRequestBranchUpdatingId: Signal<string | undefined>;
  loadPullRequestBranches(
    repositoryBindingId: string,
  ): Promise<PullRequestBranchInventoryDto | undefined>;
  comparePullRequestBranches(
    input: RequestPayload<'pull-request.compare'>,
  ): Promise<PullRequestComparisonDto | undefined>;
  createPullRequest(
    draft: RequestPayload<'pull-request.create'>,
  ): Promise<PullRequestSummaryDto | undefined>;
  updatePullRequestBranch(pullRequest: PullRequestSummaryDto): Promise<boolean>;
  publishPullRequest(executionId: string): Promise<boolean>;
}
