// #region Imports

import { z } from 'zod';
import { pullRequestBranchInventorySchema } from './PullRequestBranchInventorySchema';

// #endregion

export type PullRequestBranchInventoryDto = z.infer<typeof pullRequestBranchInventorySchema>;
