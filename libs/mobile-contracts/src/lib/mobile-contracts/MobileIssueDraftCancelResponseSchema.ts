// #region Imports

import { z } from 'zod';

// #endregion

export const mobileIssueDraftCancelResponseSchema = z.object({ cancelled: z.boolean() }).strict();
