// #region Imports
import type { z } from 'zod';
import type { mobileDisplaySettingsSchema } from '../MobileDisplaySettingsSchema';
// #endregion

/**
 * Credential-free operational configuration derived from the strict product projection schema.
 *
 * @public
 */
export type IMobileDisplaySettings = z.infer<typeof mobileDisplaySettingsSchema>;
