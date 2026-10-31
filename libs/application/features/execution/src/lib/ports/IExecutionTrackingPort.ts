// #region Imports

import type { IWorkItem, IWorkItemNote } from '@symphony/domain-work';
import type { WorkflowStageId } from '@symphony/domain-workflow';
import type { IDeliveryGroup, IDeliveryGroupProposal } from '@symphony/domain-execution';

// #endregion

/** Tracker operations consumed by execution, recovery and grouped delivery. @public */
export interface IExecutionTrackingPort {
  listWorkItems(): Promise<readonly IWorkItem[]>;
  transition(workItemId: string, state: WorkflowStageId): Promise<IWorkItem>;
  moveToColumn(workItemId: string, boardColumnId: string): Promise<IWorkItem>;
  publishWorkItemNote?(workItem: IWorkItem, note: IWorkItemNote): Promise<void>;
  synchronizeDeliveryGroup?(group: IDeliveryGroup, workItems: readonly IWorkItem[]): Promise<void>;
  synchronizeWorkItemRelation?(
    proposal: IDeliveryGroupProposal,
    workItems: readonly IWorkItem[],
  ): Promise<void>;
}
