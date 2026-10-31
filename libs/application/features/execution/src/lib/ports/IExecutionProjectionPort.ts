// #region Imports

import type { IExecutionStateProjection } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/** Execution-owned projection and its explicit group-reconciliation command. @public */
export interface IExecutionProjectionPort {
  /** Reads durable execution, queue, goal, group and event state. @public */
  executionState(): IExecutionStateProjection;

  /** Reconciles group drift synchronously against the loaded Work Items. @public */
  reconcileDeliveryGroupProjection(workItems: readonly IWorkItem[]): void;

  /** Reconciles drift before refreshing relationship proposals. @public */
  reconcileDeliveryGroupProjection(
    workItems: readonly IWorkItem[],
    refreshProposals: true,
  ): Promise<void>;
}
