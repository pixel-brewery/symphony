// #region Imports

import { z } from 'zod';

// #endregion

export const pullRequestSummarySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  repositoryBindingId: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1),
  state: z.enum(['open', 'closed', 'merged']),
  draft: z.boolean(),
  author: z.string().min(1).optional(),
  sourceBranch: z.string().min(1),
  headRevision: z.string().min(1).optional(),
  mergeRevision: z.string().min(1).optional(),
  targetBranch: z.string().min(1),
  baseBranchStatus: z.enum(['current', 'behind', 'conflicting', 'unknown']).optional(),
  requestedReviewers: z.array(z.string().min(1).max(100)).max(100).readonly().optional(),
  requestedTeams: z.array(z.string().min(1).max(200)).max(100).readonly().optional(),
  externalUrl: z.url(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
