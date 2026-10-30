// #region Imports

import { z } from 'zod';

// #endregion

export const executionQueueEntrySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1).optional(),
  workItemId: z.string().min(1),
  workItemExternalId: z.string().min(1),
  workItemTitle: z.string().min(1),
  kind: z.enum(['analysis', 'solution']),
  request: z.string().max(20_000).optional(),
  executionApproval: z.enum(['once', 'repository']).optional(),
  origin: z.enum(['operator', 'autonomy']),
  queuedAt: z.string().min(1),
  lastError: z.string().max(20_000).optional(),
  lastAttemptAt: z.string().min(1).optional(),
});
