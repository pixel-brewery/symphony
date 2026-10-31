// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Validates a bounded skill resource and its declared encoding.
 *
 * @public
 */
export const skillPackageFileSchema = z.object({
  path: z.string().min(1).max(500),
  kind: z.enum(['metadata', 'script', 'reference', 'asset']),
  encoding: z.enum(['utf8', 'base64']),
  content: z.string().max(12_000_000),
  size: z.number().int().nonnegative(),
});
