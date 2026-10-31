// #region Imports

import { z } from 'zod';

// #endregion

export const pendingMobilePairingSchema = z.object({
  id: z.string().min(1),
  deviceName: z.string().min(1).max(120),
  verificationCode: z.string().regex(/^\d{6}$/u),
  requestedAt: z.string(),
  expiresAt: z.string(),
});
