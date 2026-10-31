// #region Imports

import { z } from 'zod';

// #endregion

export const ciRunLogChunkSchema = z.object({
  runId: z.string().min(1),
  kind: z.enum(['output', 'failure']),
  offset: z.number().int().nonnegative(),
  content: z.string().max(60_000),
  nextOffset: z.number().int().nonnegative(),
  complete: z.boolean(),
});
