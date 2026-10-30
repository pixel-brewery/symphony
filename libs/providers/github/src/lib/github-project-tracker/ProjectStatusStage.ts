// #region Imports

import { type IBoardColumnMapping } from '@symphony/domain-work';
import { type WorkflowStageId } from '@symphony/domain-workflow';

// #endregion

export /** Only saved settings mappings decide the stage; unmapped options carry none. */
function projectStatusStage(
  optionId: string,
  columnMappings: readonly IBoardColumnMapping[],
): WorkflowStageId | undefined {
  return columnMappings.find((candidate) => candidate.columnId === optionId)?.stageId;
}
