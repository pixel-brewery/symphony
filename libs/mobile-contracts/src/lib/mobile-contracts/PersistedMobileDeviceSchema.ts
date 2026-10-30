// #region Imports

import { z } from 'zod';

// #endregion

export const persistedMobileDeviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/u),
  pairedAt: z.string(),
  lastSeenAt: z.string().optional(),
});
