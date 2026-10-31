// #region Imports

import type { IExecutionRecord } from './model/IExecutionRecord';
import type { IExecutionQueueEntry } from './model/IExecutionQueueEntry';
import type { IExecutionEvent } from './model/IExecutionEvent';
import type { IGoalRecord } from './model/IGoalRecord';
import type { IDeliveryGroup } from './model/IDeliveryGroup';
import type { IDeliveryGroupProposal } from './model/IDeliveryGroupProposal';

// #endregion

/** Provider-neutral execution state exposed to its composition owner. @public */
export interface IExecutionStateProjection {
  executions: readonly IExecutionRecord[];
  executionQueue: readonly IExecutionQueueEntry[];
  events: readonly IExecutionEvent[];
  goals: readonly IGoalRecord[];
  deliveryGroups: readonly IDeliveryGroup[];
  deliveryGroupProposals: readonly IDeliveryGroupProposal[];
}
