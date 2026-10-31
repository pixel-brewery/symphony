// #region Imports

import { z } from 'zod';

// #endregion

export const mobileDeviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  pairedAt: z.string(),
  lastSeenAt: z.string().optional(),
  connected: z.boolean(),
});
