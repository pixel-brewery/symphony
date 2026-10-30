// #region Imports

import type { WorkflowStageId } from '@symphony/domain-workflow';

// #endregion

/**
 * Explicit mapping of one provider column to a workflow stage. Providers never guess at
 * runtime: an item in an unmapped column stays visible without a stage, and orchestration
 * leaves it alone until a person maps the column.
 */
export interface IBoardColumnMapping {
  columnId: string;
  stageId: WorkflowStageId;
}
