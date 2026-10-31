// #region Imports

import type { IPullRequestStatus } from '@symphony/domain-delivery';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/**
 * Inspects and advances existing managed pull requests for automation qualification.
 *
 * @public
 */
export interface IAutomationDeliveryPort {
  /**
   * Reads the current state and revisions of an execution's existing pull request.
   *
   * @public
   */
  inspectPullRequest(execution: IExecutionRecord, workItem: IWorkItem): Promise<IPullRequestStatus>;

  /**
   * Advances one retained managed branch from its expected head to the current base.
   *
   * @public
   */
  updatePullRequestBranch?(
    execution: IExecutionRecord,
    workItem: IWorkItem,
    expectedHeadCommitSha: string,
  ): Promise<void>;
}
