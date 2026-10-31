// #region Imports

import type { IExecutionRecord, IGoalRecord } from '@symphony/domain-execution';
import type { IBoardCardState } from '../boardCard';
import type { IWorkItemCheck } from './IWorkItemCheck';

// #endregion

/**
 * Everything the five delivery stages of one work item are resolved from.
 *
 * @public
 */
export interface IWorkItemStageSource {
  /** The card state the board shows for the item; it decides how far the delivery is. */
  readonly progress: Pick<
    IBoardCardState,
    'status' | 'completedSteps' | 'activeStep' | 'blockedStep'
  >;
  /** Runs of this work item, in any order. */
  readonly executions: readonly IExecutionRecord[];
  readonly goal?: IGoalRecord;
  readonly checks: readonly IWorkItemCheck[];
  readonly agents: readonly { readonly id: string; readonly displayName: string }[];
}
