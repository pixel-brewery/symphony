// #region Imports

import { z } from 'zod';
import { workflowStageIdSchema } from '@symphony/ipc-contracts-workflow';

// #endregion

export const boardColumnCandidateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  suggestedStageId: workflowStageIdSchema.optional(),
});
