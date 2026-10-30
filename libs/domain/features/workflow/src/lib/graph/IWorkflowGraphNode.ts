// #region Imports

import type {
  IWorkflowDecisionOption,
  ProcessRole,
  WorkflowStageId,
  WorkflowStageKind,
} from '../workflow';
import type { WorkflowGraphNodeState } from './WorkflowGraphNodeState';

// #endregion

export interface IWorkflowGraphNode {
  readonly stageId: WorkflowStageId;
  readonly label: string;
  readonly description: string;
  readonly kind: WorkflowStageKind;
  readonly roles: readonly ProcessRole[];
  readonly decisions: readonly IWorkflowDecisionOption[];
  readonly state: WorkflowGraphNodeState;
  /** Distance from the initial stage along forward transitions. */
  readonly column: number;
  /** Lane inside the column; stages that would share a cell are stacked. */
  readonly row: number;
  /** How often the audit trail records the item entering this stage. */
  readonly visitCount: number;
  /** When the item entered the stage the last time, from the audit trail. */
  readonly enteredAt?: string;
}
