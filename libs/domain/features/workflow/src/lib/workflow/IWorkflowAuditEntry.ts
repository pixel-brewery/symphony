// #region Imports

import type { ProcessRole } from './ProcessRole';
import type { ReasonCode } from './ReasonCode';
import type { RunOutcome } from './RunOutcome';
import type { WorkflowAuditKind } from './WorkflowAuditKind';
import type { WorkflowGuardId } from './WorkflowGuardId';
import type { WorkflowStageId } from './WorkflowStageId';

// #endregion

/**
 * Append-only record of everything that moved or blocked a work item. Written before the
 * effect is applied so a crash leaves evidence rather than a silent gap.
 */
export interface IWorkflowAuditEntry {
  readonly id: string;
  readonly workItemId: string;
  readonly sequence: number;
  readonly occurredAt: string;
  readonly kind: WorkflowAuditKind;
  readonly fromStageId?: WorkflowStageId;
  readonly toStageId?: WorkflowStageId;
  readonly role?: ProcessRole;
  readonly outcome?: RunOutcome;
  readonly reasonCode?: ReasonCode;
  readonly actor: string;
  readonly detail: string;
  readonly failedGuards?: readonly WorkflowGuardId[];
}
