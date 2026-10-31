// #region Imports

import type { WorkflowArtifactKind } from './WorkflowArtifactKind';
import type { WorkflowGuardId } from './WorkflowGuardId';
import type { WorkflowStageId } from './WorkflowStageId';
import type { WorkflowTransitionId } from './WorkflowTransitionId';
import type { WorkflowTransitionTrigger } from './WorkflowTransitionTrigger';

// #endregion

export interface IWorkflowTransition {
  readonly id: WorkflowTransitionId;
  readonly from: WorkflowStageId;
  readonly to: WorkflowStageId;
  readonly trigger: WorkflowTransitionTrigger;
  readonly guards: readonly WorkflowGuardId[];
  /** Artifacts that lose validity when this transition is taken. */
  readonly invalidates?: readonly WorkflowArtifactKind[];
}
