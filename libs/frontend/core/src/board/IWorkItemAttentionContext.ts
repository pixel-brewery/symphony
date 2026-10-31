// #region Imports

import type { IWorkflowStage, IWorkItemReadiness } from '@symphony/domain-workflow';
import type { ProjectFieldDefinition } from '@symphony/domain-work';

// #endregion

/**
 * Everything the attention set needs beyond the run history to judge an item the way its stage
 * guards would. Omitted by a caller that has not loaded the snapshot yet: without it only a
 * failed run counts, which never overstates what is wrong with an item.
 */
export interface IWorkItemAttentionContext {
  readonly stages: readonly IWorkflowStage[];
  /** Field definitions of the boards that own the items. */
  readonly fields: readonly ProjectFieldDefinition[];
  /** What the stage guards would find per work item, keyed by work item id inside the function. */
  readonly readiness: readonly IWorkItemReadiness[];
}
