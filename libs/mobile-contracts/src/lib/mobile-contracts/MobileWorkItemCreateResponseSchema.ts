// #region Imports

import { z } from 'zod';

// #endregion

export const mobileWorkItemCreateResponseSchema = z
  .object({ workItemId: z.string().min(1).max(500) })
  .strict();
