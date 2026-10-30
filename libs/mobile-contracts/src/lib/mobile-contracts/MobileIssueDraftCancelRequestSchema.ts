// #region Imports

import { z } from 'zod';

// #endregion

export const mobileIssueDraftCancelRequestSchema = z
  .object({ operationId: z.string().min(1).max(200) })
  .strict();
