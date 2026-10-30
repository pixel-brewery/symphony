// #region Imports

import type { IWorkflowDefinition } from '../workflow/IWorkflowDefinition';
import type { IWorkflowTransition } from '../workflow/IWorkflowTransition';
import type { WorkflowStageId } from '../workflow/WorkflowStageId';

// #endregion

export function transitionFor(
  workflow: IWorkflowDefinition,
  stageId: WorkflowStageId,
  predicate: (transition: IWorkflowTransition) => boolean,
): IWorkflowTransition | undefined {
  return workflow.transitions.find(
    (transition) => transition.from === stageId && predicate(transition),
  );
}
