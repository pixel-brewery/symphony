// #region Imports

import type { IExecutionRepository } from '../IExecutionRepository';
import type {
  IAgenticDeliveryRecord,
  IAutomationReceipt,
  IAutomationSourceCheckpoint,
} from '@symphony/domain-automation';
import type { IWorkflowAuditEntry, IWorkflowRecord } from '@symphony/domain-workflow';

// #endregion

/** Structural capabilities retained by the existing in-memory integration fixture. @public */
export interface IMemoryExecutionRepository extends IExecutionRepository {
  saveAutomationReceipt(receipt: IAutomationReceipt): void;
  listAutomationReceipts(): readonly IAutomationReceipt[];
  saveAutomationCheckpoint(checkpoint: IAutomationSourceCheckpoint): void;
  listAutomationCheckpoints(): readonly IAutomationSourceCheckpoint[];
  saveAgenticDelivery(delivery: IAgenticDeliveryRecord): void;
  listAgenticDeliveries(): readonly IAgenticDeliveryRecord[];
  workflowRecord(workItemId: string): IWorkflowRecord | undefined;
  listWorkflowRecords(): readonly IWorkflowRecord[];
  saveWorkflowRecord(record: IWorkflowRecord): void;
  saveWorkflowAudit(entry: IWorkflowAuditEntry): void;
  listWorkflowAudit(workItemId: string): readonly IWorkflowAuditEntry[];
  nextWorkflowAuditSequence(): number;
}
