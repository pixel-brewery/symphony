// #region Imports

import type { ClosureReasonCode } from './ClosureReasonCode';
import type { HumanDecisionEffect } from './HumanDecisionEffect';
import type { WorkflowArtifactKind } from './WorkflowArtifactKind';
import type { WorkflowStageId } from './WorkflowStageId';

// #endregion

export interface IWorkflowDecisionOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly effect: HumanDecisionEffect;
  /** Target stage for `advance` and `route`; ignored otherwise. */
  readonly targetStageId?: WorkflowStageId;
  /** Closure reason for `close`; ignored otherwise. */
  readonly closureReason?: ClosureReasonCode;
  /** Artifacts invalidated by this decision, in addition to the transition defaults. */
  readonly invalidates?: readonly WorkflowArtifactKind[];
}
