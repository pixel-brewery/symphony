// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IPullRequestReference, IPullRequestStatus } from '@symphony/domain-delivery';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

export interface IPullRequestDeliveryPort {
  publishPullRequest(
    execution: IExecutionRecord,
    workItem: IWorkItem,
  ): Promise<IPullRequestReference>;
  inspectPullRequest(execution: IExecutionRecord, workItem: IWorkItem): Promise<IPullRequestStatus>;
  /** Advances one retained managed pull-request branch to its current base revision. */
  updatePullRequestBranch?(
    execution: IExecutionRecord,
    workItem: IWorkItem,
    expectedHeadCommitSha: string,
  ): Promise<void>;
}
