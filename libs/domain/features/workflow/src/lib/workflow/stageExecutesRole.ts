// #region Imports

import type { IWorkflowStage } from './IWorkflowStage';
import type { ProcessRole } from './ProcessRole';
import type { WorkflowStageId } from './WorkflowStageId';
import { stageRoles } from './stageRoles';

// #endregion

/** Whether the given stage executes the given role. */
export function stageExecutesRole(
  stages: readonly IWorkflowStage[],
  stageId: WorkflowStageId | undefined,
  role: ProcessRole,
): boolean {
  return stageRoles(stages, stageId).includes(role);
}
