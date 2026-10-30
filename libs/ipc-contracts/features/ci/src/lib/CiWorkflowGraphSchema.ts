// #region Imports

import { z } from 'zod';

// #endregion

export const ciWorkflowGraphSchema = z.object({
  revision: z.string().min(1),
  path: z.string().min(1),
  jobs: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        needs: z.array(z.string()).max(1000).readonly(),
        matrix: z.boolean(),
        condition: z.string().optional(),
        environment: z.string().optional(),
      }),
    )
    .max(1000)
    .readonly(),
  unresolved: z.array(z.string()).max(2000).readonly(),
});
