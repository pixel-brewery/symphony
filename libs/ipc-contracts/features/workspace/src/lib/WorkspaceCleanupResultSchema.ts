// #region Imports

import { z } from 'zod';

// #endregion

export const workspaceCleanupResultSchema = z.object({
  removed: z.number().int().nonnegative(),
  missing: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});
