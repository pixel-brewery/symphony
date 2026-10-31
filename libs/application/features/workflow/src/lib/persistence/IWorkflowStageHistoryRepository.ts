// #region Imports

import type { IWorkflowStageChangeHistory } from '@symphony/domain-workflow';
import type { IWorkflowStageChangeQuery } from '../history/IWorkflowStageChangeQuery';

// #endregion

/**
 * Reads the stage changes recorded in the append-only workflow audit in bulk.
 *
 * @public
 */
export interface IWorkflowStageHistoryRepository {
  /**
   * Lists every stage change of each work item of the scope that changed stage at or after
   * `since`, including that item's earlier changes, newest first and at most `limit` of them.
   *
   * @param query - Scope, lower bound and maximum.
   * @returns The changes and the instant from which they are complete.
   * @public
   */
  listStageChanges(query: IWorkflowStageChangeQuery): IWorkflowStageChangeHistory;
}
