// #region Imports

import { z } from 'zod';
import { workflowStageChangeHistorySchema } from './WorkflowStageChangeHistorySchema';

// #endregion

/**
 * Validated stage-change history as the renderer receives it.
 *
 * @public
 */
export type WorkflowStageChangeHistoryDto = z.infer<typeof workflowStageChangeHistorySchema>;
