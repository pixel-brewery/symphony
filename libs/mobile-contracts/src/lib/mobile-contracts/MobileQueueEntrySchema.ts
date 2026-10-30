// #region Imports

import { z } from 'zod';

// #endregion

/** One accepted step waiting for a free execution slot on the desktop. */
export const mobileQueueEntrySchema = z.object({
  id: z.string().min(1),
  workItemId: z.string().min(1),
  ticketTitle: z.string().min(1),
  ticketExternalId: z.string().min(1),
  kind: z.enum(['analysis', 'solution']),
  position: z.number().int().positive(),
  queuedAt: z.string(),
  lastError: z.string().max(20_000).optional(),
});
