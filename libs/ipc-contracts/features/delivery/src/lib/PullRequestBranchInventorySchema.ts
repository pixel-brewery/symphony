// #region Imports

import { z } from 'zod';

// #endregion

export const pullRequestBranchInventorySchema = z.object({
  repositoryBindingId: z.string().min(1),
  defaultBranch: z.string().min(1),
  branches: z
    .array(z.object({ name: z.string().min(1).max(255), protected: z.boolean() }))
    .max(1_000)
    .readonly(),
});
