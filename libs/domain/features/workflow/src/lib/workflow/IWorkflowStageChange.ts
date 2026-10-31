// #region Imports

import type { WorkflowStageId } from './WorkflowStageId';

// #endregion

/**
 * One recorded move of a work item between workflow stages, reduced from the append-only audit
 * to what reporting needs.
 *
 * @public
 */
export interface IWorkflowStageChange {
  /** The work item that moved. @public @readonly */
  readonly workItemId: string;
  /** The stage it left; absent when the audit did not record one. @public @readonly */
  readonly fromStageId?: WorkflowStageId;
  /** The stage it entered. @public @readonly */
  readonly toStageId: WorkflowStageId;
  /** When the move was recorded (ISO instant). @public @readonly */
  readonly changedAt: string;
}
