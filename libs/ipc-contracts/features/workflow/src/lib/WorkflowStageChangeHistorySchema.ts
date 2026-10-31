// #region Imports

import { z } from 'zod';
import { workflowStageChangeSchema } from './WorkflowStageChangeSchema';

// #endregion

/**
 * Recorded stage changes of a workspace scope since an instant, bounded to 10,000 changes, with
 * the instant from which they are complete.
 *
 * @public
 */
export const workflowStageChangeHistorySchema = z.object({
  changes: z.array(workflowStageChangeSchema).max(10_000).readonly(),
  recordedSince: z.iso.datetime({ offset: true }).optional(),
  truncated: z.boolean(),
});
