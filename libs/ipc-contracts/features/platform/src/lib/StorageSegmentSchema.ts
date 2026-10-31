// #region Imports

import { z } from 'zod';

// #endregion

export const storageSegmentSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  allocatedBytes: z.number().int().nonnegative(),
});
