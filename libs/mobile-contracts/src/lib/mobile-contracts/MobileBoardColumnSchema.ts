// #region Imports

import { z } from 'zod';
import { mobileTicketSchema } from './MobileTicketSchema';
import { mobileWorkflowStageIdSchema } from './MobileWorkflowStageIdSchema';

// #endregion

export const mobileBoardColumnSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  stageId: mobileWorkflowStageIdSchema.optional(),
  sourceId: z.string().min(1).optional(),
  ticketCount: z.number().int().nonnegative(),
  tickets: z.array(mobileTicketSchema).readonly(),
});
