// #region Imports

import { z } from 'zod';

// #endregion

export const identitySchema = z
  .object({
    user: z.object({ displayName: z.string().optional() }).passthrough().optional(),
    application: z.object({ displayName: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();
