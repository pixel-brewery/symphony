// #region Imports

import type {
  IDeliveryGroup,
  IDeliveryGroupProposal,
  IExecutionEvent,
  IExecutionQueueEntry,
  IExecutionRecord,
  IGoalRecord,
} from '@symphony/domain-execution';

// #endregion

export interface IExecutionRepository {
  initialize(): void;
  saveExecution(execution: IExecutionRecord): void;
  saveEvent(event: IExecutionEvent): void;
  listExecutions(): readonly IExecutionRecord[];
  listEvents(): readonly IExecutionEvent[];
  saveDeliveryGroup(group: IDeliveryGroup): void;
  listDeliveryGroups(): readonly IDeliveryGroup[];
  saveDeliveryGroupProposal(proposal: IDeliveryGroupProposal): void;
  listDeliveryGroupProposals(): readonly IDeliveryGroupProposal[];
  saveGoal(goal: IGoalRecord): void;
  listGoals(): readonly IGoalRecord[];
  /** Durable steps waiting for a free execution slot; see `ExecutionQueueEntry`. */
  saveExecutionQueueEntry(entry: IExecutionQueueEntry): void;
  removeExecutionQueueEntry(entryId: string): void;
  listExecutionQueue(): readonly IExecutionQueueEntry[];
}
