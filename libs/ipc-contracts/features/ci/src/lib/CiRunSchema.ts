// #region Imports

import { z } from 'zod';

// #endregion

export const ciRunSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  ciBindingId: z.string().min(1),
  repositoryBindingId: z.string().min(1),
  workflowId: z.string().min(1).optional(),
  name: z.string().min(1),
  title: z.string().min(1).optional(),
  event: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  runNumber: z.number().int().positive().optional(),
  status: z.enum(['queued', 'in-progress', 'succeeded', 'failed', 'cancelled']),
  branch: z.string().optional(),
  revision: z.string().optional(),
  externalUrl: z.url().optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  runAttempt: z.number().int().positive().optional(),
});
