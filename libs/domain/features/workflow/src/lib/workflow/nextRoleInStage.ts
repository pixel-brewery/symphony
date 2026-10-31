// #region Imports

import type { IWorkflowStage } from './IWorkflowStage';
import type { ProcessRole } from './ProcessRole';
import type { WorkflowStageId } from './WorkflowStageId';
import { stageRoles } from './stageRoles';

// #endregion

/** Role that follows the given one inside the same stage, if the stage chains several. */
export function nextRoleInStage(
  stages: readonly IWorkflowStage[],
  stageId: WorkflowStageId,
  role: ProcessRole,
): ProcessRole | undefined {
  const roles = stageRoles(stages, stageId);
  const index = roles.indexOf(role);
  return index >= 0 ? roles[index + 1] : undefined;
}
