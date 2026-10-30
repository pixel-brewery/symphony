// #region Imports

import type { IWorkflowAuditEntry, IWorkflowRecord } from '@symphony/domain-workflow';

// #endregion

/** Durable workflow state and its append-only audit trail. */
export interface IWorkflowRecordRepository {
  workflowRecord(workItemId: string): IWorkflowRecord | undefined;
  listWorkflowRecords(): readonly IWorkflowRecord[];
  saveWorkflowRecord(record: IWorkflowRecord): void;
  saveWorkflowAudit(entry: IWorkflowAuditEntry): void;
  listWorkflowAudit(workItemId: string): readonly IWorkflowAuditEntry[];
  nextWorkflowAuditSequence(): number;
}
