// #region Imports

import type { IWorkflowStage } from './IWorkflowStage';
import type { WorkflowStageId } from './WorkflowStageId';

// #endregion

export function findStage(
  stages: readonly IWorkflowStage[],
  stageId: WorkflowStageId | undefined,
): IWorkflowStage | undefined {
  return stageId === undefined ? undefined : stages.find((stage) => stage.id === stageId);
}
