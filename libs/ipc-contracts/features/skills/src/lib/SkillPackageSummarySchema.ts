// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Validates the public metadata and provenance of a skill package.
 *
 * @public
 */
export const skillPackageSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string(),
  source: z.enum(['user', 'repository', 'legacy', 'bundled']),
  location: z.string().min(1),
  editable: z.boolean(),
  implicitInvocation: z.boolean(),
  updatedAt: z.string(),
  digest: z.string(),
  resourceCount: z.number().int().nonnegative(),
  warnings: z.array(z.string()).readonly(),
});
