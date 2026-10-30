// #region Imports

import { z } from 'zod';

// #endregion

export const pullRequestComparisonSchema = z.object({
  repositoryBindingId: z.string().min(1),
  targetBranch: z.string().min(1),
  sourceBranch: z.string().min(1),
  status: z.enum(['identical', 'ahead', 'behind', 'diverged']),
  aheadBy: z.number().int().nonnegative(),
  behindBy: z.number().int().nonnegative(),
  changedFiles: z.number().int().nonnegative(),
  commits: z
    .array(
      z.object({
        revision: z.string().min(1).max(64),
        title: z.string().max(1_000),
        author: z.string().min(1).max(200).optional(),
        committedAt: z.string().min(1).optional(),
      }),
    )
    .max(100)
    .readonly(),
  existingPullRequest: z
    .object({ number: z.number().int().positive(), externalUrl: z.url() })
    .optional(),
});
