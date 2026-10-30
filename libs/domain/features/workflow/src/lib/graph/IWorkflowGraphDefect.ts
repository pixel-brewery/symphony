// #region Imports

import type { WorkflowStageId, WorkflowTransitionId } from '../workflow';

// #endregion

/**
 * A configuration defect the graph exposes structurally. The runtime view can ignore these;
 * an editor should show them, because the schema alone does not catch them.
 */
export interface IWorkflowGraphDefect {
  readonly kind:
    | 'unreachable-stage'
    | 'dead-end-stage'
    | 'unknown-transition-endpoint'
    | 'gate-without-decision';
  readonly stageId?: WorkflowStageId;
  readonly transitionId?: WorkflowTransitionId;
  readonly detail: string;
}
