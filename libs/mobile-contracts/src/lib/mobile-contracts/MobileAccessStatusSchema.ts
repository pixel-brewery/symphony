// #region Imports

import { z } from 'zod';
import { mobileAccessRuntimeStateSchema } from './MobileAccessRuntimeStateSchema';
import { mobileDeviceSchema } from './MobileDeviceSchema';
import { pendingMobilePairingSchema } from './PendingMobilePairingSchema';

// #endregion

export const mobileAccessStatusSchema = z.object({
  enabled: z.boolean(),
  state: mobileAccessRuntimeStateSchema,
  origin: z.url().optional(),
  unavailableReason: z.string().max(500).optional(),
  pendingPairings: z.array(pendingMobilePairingSchema).readonly(),
  devices: z.array(mobileDeviceSchema).readonly(),
});
