// #region Imports

import { z } from 'zod';

// #endregion

export const availableAiModelsSchema = z.object({
  scopeId: z.string().min(1),
  models: z
    .array(
      z.object({
        id: z.string().min(1),
        providerId: z.string().min(1),
        displayName: z.string().min(1),
      }),
    )
    .max(5_000)
    .readonly(),
  source: z.literal('cli'),
  error: z.string().optional(),
});
