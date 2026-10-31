// #region Imports

import { z } from 'zod';
import { workflowStageIdSchema } from '@symphony/ipc-contracts-workflow';

// #endregion

export const boardColumnSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sourceId: z.string().min(1).optional(),
  stageId: workflowStageIdSchema.optional(),
});
