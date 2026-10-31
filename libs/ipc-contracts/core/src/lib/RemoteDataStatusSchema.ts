// #region Imports

import { z } from 'zod';

// #endregion

export const remoteDataStatusSchema = z.object({
  state: z.enum(['current', 'stale', 'unavailable']),
  lastSuccessfulRefreshAt: z.string().min(1).optional(),
  reason: z.enum(['authentication-required', 'rate-limited']).optional(),
  retryAt: z.string().datetime().optional(),
});
