// #region Imports

import type { IPlatformClock } from '@symphony/application-core';
import type { IWorkflowStageHistoryRepository } from '../persistence/IWorkflowStageHistoryRepository';

// #endregion

/**
 * Collaborators of the stage-history query.
 *
 * @public
 */
export interface IWorkflowStageHistoryDependencies {
  /** Bulk reader of the workflow audit. @public @readonly */
  readonly repository: IWorkflowStageHistoryRepository;
  /** Current instant, which bounds the requested lower bound. @public @readonly */
  readonly clock: IPlatformClock;
}
