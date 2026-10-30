// #region Imports

import { mobileAccessStatusSchema, mobilePairingChallengeSchema } from '@symphony/mobile-contracts';

// #endregion

/**
 * Owns the validated mobile response payloads at the desktop boundary.
 *
 * @public
 */
export const mobileResponseSchemas = {
  'mobile-access.status.get': mobileAccessStatusSchema,
  'mobile-access.enable': mobileAccessStatusSchema,
  'mobile-access.disable': mobileAccessStatusSchema,
  'mobile-access.pairing.create': mobilePairingChallengeSchema,
  'mobile-access.pairing.approve': mobileAccessStatusSchema,
  'mobile-access.pairing.reject': mobileAccessStatusSchema,
  'mobile-access.device.revoke': mobileAccessStatusSchema,
  'mobile-access.devices.revoke-all': mobileAccessStatusSchema,
} as const;
