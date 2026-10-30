// #region Imports

import { z } from 'zod';

// #endregion

export const powerStateSchema = z.object({
  keepAwakeWhileBusy: z.boolean(),
  engaged: z.boolean(),
  activeTaskCount: z.number().int().nonnegative(),
});
