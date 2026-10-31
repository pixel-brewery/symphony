// #region Imports

import { z } from 'zod';

// #endregion

export const ciPendingApprovalSchema = z.object({
  environmentId: z.number().int().positive(),
  environment: z.string().min(1),
  canApprove: z.boolean(),
  waitUntil: z.iso.datetime().optional(),
});
