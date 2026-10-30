// #region Imports

import type { WorkflowStageId } from '../workflow/WorkflowStageId';

// #endregion

export function routeKey(from: WorkflowStageId, to: WorkflowStageId): string {
  return `${from}->${to}`;
}
