// #region Imports

import { z } from 'zod';
import { ciRunSchema } from './CiRunSchema';

// #endregion

/**
 * Finished workflow runs Symphony recorded for a workspace scope since an instant, bounded to
 * 10,000 runs, with the instant from which they are complete.
 *
 * @public
 */
export const ciRunHistorySchema = z.object({
  runs: z.array(ciRunSchema).max(10_000).readonly(),
  recordedSince: z.iso.datetime({ offset: true }).optional(),
  truncated: z.boolean(),
});
