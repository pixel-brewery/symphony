// #region Imports

import { z } from 'zod';

// #endregion

export const modelIntelligenceSchema = z.object({
  scores: z
    .array(
      z.object({
        model: z.string().min(1),
        reasoningEffort: z.string().min(1).nullable(),
        intelligenceIndex: z.number().min(0).max(100).nullable(),
        matchedModelName: z.string().min(1).nullable(),
      }),
    )
    .max(200)
    .readonly(),
  indexVersion: z.string().min(1).nullable(),
  retrievedAt: z.iso.datetime().nullable(),
  source: z.literal('artificial-analysis'),
  error: z.string().optional(),
});
