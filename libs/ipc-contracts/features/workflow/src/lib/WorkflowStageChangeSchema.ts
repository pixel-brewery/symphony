// #region Imports

import { z } from 'zod';
import { workflowStageIdSchema } from './WorkflowStageIdSchema';

// #endregion

/**
 * One recorded move of a work item between workflow stages at the desktop boundary.
 *
 * @public
 */
export const workflowStageChangeSchema = z.object({
  workItemId: z.string().min(1),
  fromStageId: workflowStageIdSchema.optional(),
  toStageId: workflowStageIdSchema,
  changedAt: z.iso.datetime({ offset: true }),
});
