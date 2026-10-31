// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Validates the result of an explicit skill export or deletion.
 *
 * @public
 */
export const skillOperationSchema = z.object({
  message: z.string(),
  path: z.string().optional(),
});
