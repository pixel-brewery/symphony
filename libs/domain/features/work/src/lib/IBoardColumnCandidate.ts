// #region Imports

import type { WorkflowStageId } from '@symphony/domain-workflow';

// #endregion

/** One provider column read for the settings editor, with the workflow state Symphony suggests as mapping default. */
export interface IBoardColumnCandidate {
  id: string;
  label: string;
  suggestedStageId?: WorkflowStageId;
}
