// #region Imports

import { z } from 'zod';
import { externalHttpUrlSchema } from './ExternalHttpUrlSchema';

// #endregion

export const mobileMergeRequestSchema = z.object({
  id: z.string().min(1).max(500),
  workspaceId: z.string().min(1).max(500),
  number: z.number().int().positive(),
  title: z.string().min(1).max(2_000),
  state: z.enum(['open', 'closed', 'merged']),
  draft: z.boolean(),
  author: z.string().min(1).max(500).optional(),
  sourceBranch: z.string().min(1).max(500),
  targetBranch: z.string().min(1).max(500),
  externalUrl: externalHttpUrlSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
