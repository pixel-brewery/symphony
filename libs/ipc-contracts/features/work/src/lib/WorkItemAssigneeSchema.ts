// #region Imports

import { z } from 'zod';

// #endregion

export const workItemAssigneeSchema = z.object({
  login: z.string().min(1),
  displayName: z.string().min(1).optional(),
  avatarUrl: z.url().optional(),
});
