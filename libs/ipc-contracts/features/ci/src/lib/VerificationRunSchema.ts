// #region Imports

import { z } from 'zod';

// #endregion

export const verificationRunSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  repositoryBindingId: z.string().min(1),
  planId: z.string().min(1),
  revision: z.string().min(1),
  approval: z.enum(['once', 'repository', 'stored']),
  state: z.enum(['succeeded', 'failed', 'cancelled']),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  steps: z
    .array(
      z.object({
        stepId: z.string().min(1),
        state: z.enum(['succeeded', 'failed', 'cancelled']),
        startedAt: z.string().min(1),
        finishedAt: z.string().min(1),
        exitCode: z.number().int().optional(),
        output: z.string(),
      }),
    )
    .max(100)
    .readonly(),
});
