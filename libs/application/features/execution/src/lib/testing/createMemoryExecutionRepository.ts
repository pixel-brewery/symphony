// #region Imports

import type {
  IAgenticDeliveryRecord,
  IAutomationReceipt,
  IAutomationSourceCheckpoint,
} from '@symphony/domain-automation';
import type {
  IDeliveryGroup,
  IDeliveryGroupProposal,
  IExecutionEvent,
  IExecutionQueueEntry,
  IExecutionRecord,
  IGoalRecord,
} from '@symphony/domain-execution';
import type { IWorkflowAuditEntry, IWorkflowRecord } from '@symphony/domain-workflow';
import type { IMemoryExecutionRepository } from './IMemoryExecutionRepository';

// #endregion

/** Creates an infrastructure-free execution repository for application tests. */
export function createMemoryExecutionRepository(): IMemoryExecutionRepository {
  const executions: IExecutionRecord[] = [];
  const events: IExecutionEvent[] = [];
  const receipts: IAutomationReceipt[] = [];
  const checkpoints: IAutomationSourceCheckpoint[] = [];
  const deliveries: IAgenticDeliveryRecord[] = [];
  const deliveryGroups: IDeliveryGroup[] = [];
  const deliveryGroupProposals: IDeliveryGroupProposal[] = [];
  const goals: IGoalRecord[] = [];
  const queue: IExecutionQueueEntry[] = [];
  const workflowRecords: IWorkflowRecord[] = [];
  const workflowAudit: IWorkflowAuditEntry[] = [];

  return {
    initialize: () => undefined,
    saveExecution: (execution) => upsert(executions, execution, (value) => value.id),
    saveEvent: (event) => upsert(events, event, (value) => value.id),
    listExecutions: () => [...executions].reverse(),
    listEvents: () => [...events].sort((left, right) => left.sequence - right.sequence),
    saveAutomationReceipt: (receipt) => upsert(receipts, receipt, (value) => value.signalId),
    listAutomationReceipts: () => [...receipts],
    saveAutomationCheckpoint: (checkpoint) =>
      upsert(checkpoints, checkpoint, (value) => value.sourceId),
    listAutomationCheckpoints: () => [...checkpoints],
    saveAgenticDelivery: (delivery) => upsert(deliveries, delivery, (value) => value.id),
    listAgenticDeliveries: () => [...deliveries],
    saveDeliveryGroup: (group) => upsert(deliveryGroups, group, (value) => value.id),
    listDeliveryGroups: () => [...deliveryGroups],
    saveDeliveryGroupProposal: (proposal) =>
      upsert(deliveryGroupProposals, proposal, (value) => value.id),
    listDeliveryGroupProposals: () => [...deliveryGroupProposals],
    saveGoal: (goal) => upsert(goals, goal, (value) => value.id),
    listGoals: () => [...goals],
    saveExecutionQueueEntry: (entry) => upsert(queue, entry, (value) => value.id),
    removeExecutionQueueEntry: (entryId) => remove(queue, (value) => value.id === entryId),
    listExecutionQueue: () =>
      [...queue].sort((left, right) => left.queuedAt.localeCompare(right.queuedAt)),
    workflowRecord: (workItemId) =>
      workflowRecords.find((record) => record.workItemId === workItemId),
    listWorkflowRecords: () => [...workflowRecords],
    saveWorkflowRecord: (record) => upsert(workflowRecords, record, (value) => value.workItemId),
    saveWorkflowAudit: (entry) => workflowAudit.push(entry),
    listWorkflowAudit: (workItemId) =>
      workflowAudit
        .filter((entry) => entry.workItemId === workItemId)
        .sort((left, right) => left.sequence - right.sequence),
    nextWorkflowAuditSequence: () =>
      Math.max(0, ...workflowAudit.map((entry) => entry.sequence)) + 1,
  };
}

function upsert<T>(values: T[], value: T, keyOf: (candidate: T) => string): void {
  const index = values.findIndex((candidate) => keyOf(candidate) === keyOf(value));
  if (index >= 0) values.splice(index, 1);
  values.push(value);
}

function remove<T>(values: T[], predicate: (candidate: T) => boolean): void {
  const index = values.findIndex(predicate);
  if (index >= 0) values.splice(index, 1);
}
