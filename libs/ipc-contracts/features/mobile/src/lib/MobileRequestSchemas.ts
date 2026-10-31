// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Owns the validated mobile request payloads at the desktop boundary.
 *
 * @public
 */
export const mobileRequestSchemas = {
  'mobile-access.status.get': z.object({}),
  'mobile-access.enable': z.object({}),
  'mobile-access.disable': z.object({}),
  'mobile-access.pairing.create': z.object({}),
  'mobile-access.pairing.approve': z.object({ pairingId: z.string().min(1) }),
  'mobile-access.pairing.reject': z.object({ pairingId: z.string().min(1) }),
  'mobile-access.device.revoke': z.object({ deviceId: z.string().min(1) }),
  'mobile-access.devices.revoke-all': z.object({}),
} as const;
