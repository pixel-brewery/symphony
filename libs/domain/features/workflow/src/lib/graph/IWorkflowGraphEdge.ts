// #region Imports

import type {
  WorkflowArtifactKind,
  WorkflowGuardId,
  WorkflowStageId,
  WorkflowTransitionId,
  WorkflowTransitionTrigger,
} from '../workflow';
import type { WorkflowGraphEdgeDirection } from './WorkflowGraphEdgeDirection';
import type { WorkflowGraphEdgeState } from './WorkflowGraphEdgeState';

// #endregion

export interface IWorkflowGraphEdge {
  readonly transitionId: WorkflowTransitionId;
  readonly from: WorkflowStageId;
  readonly to: WorkflowStageId;
  readonly trigger: WorkflowTransitionTrigger;
  readonly guards: readonly WorkflowGuardId[];
  readonly invalidates: readonly WorkflowArtifactKind[];
  readonly direction: WorkflowGraphEdgeDirection;
  readonly state: WorkflowGraphEdgeState;
  /** How often the audit trail records this transition being taken. */
  readonly traversalCount: number;
  readonly lastTraversedAt?: string;
}
