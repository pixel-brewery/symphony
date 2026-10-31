// #region Imports

import type { WorkflowStageId } from '@symphony/domain-workflow';

// #endregion

/**
 * One board column as the provider defines it. GitHub Projects columns are the
 * options of the project's status field, so their ids are option ids and their
 * labels follow the project. Azure DevOps columns come from the team board or the
 * work-item type states.
 */
export interface IBoardColumn {
  id: string;
  label: string;
  /** Work-item source that owns the column; missing on merged or synthesized columns. */
  sourceId?: string;
  /** Workflow stage the column maps to; missing when the column is not mapped. */
  stageId?: WorkflowStageId;
}
