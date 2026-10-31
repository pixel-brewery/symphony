// #region Imports

import { z } from 'zod';
import { projectFieldValueSchema } from './ProjectFieldValueSchema';

// #endregion

export const workItemMutationSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  workItemType: z.string().min(1).max(200).optional(),
  revision: z.number().int().nonnegative().optional(),
  title: z.string().trim().min(1).max(256),
  body: z.string().max(1_000_000),
  repository: z.string().min(1).max(500),
  repositoryBindingIds: z.array(z.string().min(1)).max(20).readonly().optional(),
  projectFields: z.array(projectFieldValueSchema).max(200).readonly(),
  labels: z.array(z.string().min(1).max(100)).max(100).readonly(),
  assignees: z.array(z.string().min(1).max(100)).max(100).readonly(),
});
