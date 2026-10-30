// #region Imports

import type { IWorkflowDecisionOption } from './IWorkflowDecisionOption';
import type { ProcessRole } from './ProcessRole';
import type { WorkflowStageId } from './WorkflowStageId';
import type { WorkflowStageKind } from './WorkflowStageKind';

// #endregion

export interface IWorkflowStage {
  readonly id: WorkflowStageId;
  readonly label: string;
  readonly description: string;
  readonly kind: WorkflowStageKind;
  /**
   * Roles executed while the item rests in this stage, in order. A stage advances when the
   * last role reports `pass`, which is how one visible stage can contain several steps -
   * implementation followed by independent verification, for example.
   */
  readonly roles?: readonly ProcessRole[];
  /** Whether the first role starts without an operator command. */
  readonly autoStart?: boolean;
  /** Decision options offered by a human gate. */
  readonly decisions?: readonly IWorkflowDecisionOption[];
}
