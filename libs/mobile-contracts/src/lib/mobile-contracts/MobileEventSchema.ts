// #region Imports

import { z } from 'zod';

// #endregion

export const mobileEventSchema = z.object({
  type: z.literal('snapshot.invalidated'),
  occurredAt: z.string(),
});
