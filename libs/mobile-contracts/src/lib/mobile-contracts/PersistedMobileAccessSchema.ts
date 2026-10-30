// #region Imports

import { z } from 'zod';
import { persistedMobileDeviceSchema } from './PersistedMobileDeviceSchema';

// #endregion

export const persistedMobileAccessSchema = z.object({
  version: z.literal(1),
  enabled: z.boolean(),
  devices: z.array(persistedMobileDeviceSchema).max(100).readonly(),
});
