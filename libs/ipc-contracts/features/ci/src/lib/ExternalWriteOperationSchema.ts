// #region Imports

import { z } from 'zod';
import { ciRunSchema } from './CiRunSchema';

// #endregion

/** Persisted intents use the same validation boundary as commands. @public */
export const externalWriteOperationSchema = z
  .object({
    id: z.string().min(1),
    scope: z.string().min(1),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    kind: z.enum(['workflow-dispatch', 'approval']),
    state: z.enum(['submitting', 'accepted', 'uncertain']),
    startedAt: z.string().datetime(),
    run: ciRunSchema.optional(),
  })
  .strict();
