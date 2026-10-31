// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Owns the validated automation response payloads at the desktop boundary.
 *
 * @public
 */
export const automationResponseSchemas = {
  'autonomy.status.get': z.object({
    enabled: z.boolean(),
    maximum: z.number().int().positive(),
    active: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    nextCycleAt: z.iso.datetime().optional(),
  }),
  'autonomy.set-enabled': z.object({
    enabled: z.boolean(),
    maximum: z.number().int().positive(),
    active: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    nextCycleAt: z.iso.datetime().optional(),
  }),
} as const;
