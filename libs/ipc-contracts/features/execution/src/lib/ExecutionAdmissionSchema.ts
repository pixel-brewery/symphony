// #region Imports

import { z } from 'zod';
import { executionQueueEntrySchema } from './ExecutionQueueEntrySchema';
import { executionRecordSchema } from './ExecutionRecordSchema';

// #endregion

/** A requested step either runs now or waits for a slot; both are successful outcomes. */
export const executionAdmissionSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('started'), execution: executionRecordSchema }),
  z.object({ outcome: z.literal('queued'), entry: executionQueueEntrySchema }),
]);
