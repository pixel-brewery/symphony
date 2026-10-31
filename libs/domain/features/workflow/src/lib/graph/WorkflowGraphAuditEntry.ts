// #region Imports

import type { IWorkflowAuditEntry } from '../workflow';

// #endregion

/** The parts of an audit entry the projection reads. */
export type WorkflowGraphAuditEntry = Pick<
  IWorkflowAuditEntry,
  'kind' | 'occurredAt' | 'fromStageId' | 'toStageId' | 'role' | 'outcome'
>;
