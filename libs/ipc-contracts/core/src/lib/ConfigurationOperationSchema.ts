// #region Imports

import { z } from 'zod';

// #endregion

export const configurationOperationSchema = z.object({
  status: z.enum(['started', 'completed']),
  message: z.string(),
});
