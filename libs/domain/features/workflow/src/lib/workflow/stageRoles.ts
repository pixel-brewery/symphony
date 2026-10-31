// #region Imports

import type { IWorkflowStage } from './IWorkflowStage';
import type { ProcessRole } from './ProcessRole';
import type { WorkflowStageId } from './WorkflowStageId';
import { findStage } from './findStage';

// #endregion

/** Roles the given stage executes, in order. Empty for gates and terminal stages. */
export function stageRoles(
  stages: readonly IWorkflowStage[],
  stageId: WorkflowStageId | undefined,
): readonly ProcessRole[] {
  const stage = findStage(stages, stageId);
  return stage?.kind === 'automated' ? (stage.roles ?? []) : [];
}
