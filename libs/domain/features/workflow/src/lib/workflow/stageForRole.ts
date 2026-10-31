// #region Imports

import type { IWorkflowStage } from './IWorkflowStage';
import type { ProcessRole } from './ProcessRole';
import type { WorkflowStageId } from './WorkflowStageId';

// #endregion

/** First stage that executes the given role, which is where work for that role belongs. */
export function stageForRole(
  stages: readonly IWorkflowStage[],
  role: ProcessRole,
): WorkflowStageId | undefined {
  return stages.find((stage) => stage.kind === 'automated' && (stage.roles ?? []).includes(role))
    ?.id;
}
