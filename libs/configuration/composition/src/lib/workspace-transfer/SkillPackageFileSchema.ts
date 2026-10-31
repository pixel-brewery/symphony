// #region Imports

import { z } from 'zod';

// #endregion

export const skillPackageFileSchema = z.object({
  path: z.string().min(1).max(500),
  kind: z.enum(['script', 'reference', 'asset']),
  encoding: z.enum(['utf8', 'base64']),
  content: z.string().max(12_000_000),
  size: z.number().int().nonnegative(),
});
