// #region Imports

import { z } from 'zod';

// #endregion

export const pathSelectionResponseSchema = z.object({
  canceled: z.boolean(),
  paths: z.array(z.string().min(1).max(4_096)).max(32).readonly(),
});
