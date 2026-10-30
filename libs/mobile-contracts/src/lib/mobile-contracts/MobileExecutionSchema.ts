// #region Imports

import { z } from 'zod';
import { mobileExecutionKindSchema } from './MobileExecutionKindSchema';
import { mobileExecutionStateSchema } from './MobileExecutionStateSchema';

// #endregion

export const mobileExecutionSchema = z.object({
  id: z.string().min(1),
  workItemId: z.string().min(1),
  ticketTitle: z.string().min(1),
  kind: mobileExecutionKindSchema,
  state: mobileExecutionStateSchema,
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  latestProgress: z.string().max(20_000).optional(),
  summary: z.string().max(1_000_000).optional(),
  error: z.string().max(20_000).optional(),
});
