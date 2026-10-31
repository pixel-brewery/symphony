// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Owns the validated automation request payloads at the desktop boundary.
 *
 * @public
 */
export const automationRequestSchemas = {
  'autonomy.status.get': z.object({}),
  'autonomy.set-enabled': z.object({ enabled: z.boolean() }),
} as const;
