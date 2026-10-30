// #region Imports

import { z } from 'zod';

// #endregion

export const mobileApiErrorSchema = z.object({
  code: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
});
