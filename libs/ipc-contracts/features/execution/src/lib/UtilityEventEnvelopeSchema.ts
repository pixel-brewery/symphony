// #region Imports

import { z } from 'zod';
import { executionEventSchema } from './ExecutionEventSchema';

// #endregion

export const utilityEventEnvelopeSchema = z.object({
  topic: z.literal('execution.event'),
  event: executionEventSchema,
});
