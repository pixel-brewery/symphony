// #region Imports

import type { WorkflowStageId } from '@symphony/domain-workflow';

// #endregion

/** Board-column mapping choice; empty string keeps the column unmapped. */
export type BoardColumnMappingChoice = WorkflowStageId | '';
