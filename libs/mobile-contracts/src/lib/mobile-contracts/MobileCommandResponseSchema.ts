// #region Imports

import { z } from 'zod';

// #endregion

export const mobileCommandResponseSchema = z.object({
  accepted: z.literal(true),
  /** Present only for commands that start or address a run. */
  executionId: z.string().min(1).optional(),
  /** Present when the step was accepted but waits for a free execution slot. */
  queueEntryId: z.string().min(1).optional(),
});
