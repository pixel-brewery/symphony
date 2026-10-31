// #region Imports

import { z } from 'zod';
import { executionEventSchema } from './ExecutionEventSchema';
import { executionQueueEntrySchema } from './ExecutionQueueEntrySchema';
import { executionRecordSchema } from './ExecutionRecordSchema';
import { goalRecordSchema } from './GoalRecordSchema';

// #endregion

export const executionRuntimeStateSchema = z.object({
  executions: z.array(executionRecordSchema).readonly(),
  executionQueue: z.array(executionQueueEntrySchema).readonly().optional().default([]),
  events: z.array(executionEventSchema).readonly(),
  goals: z.array(goalRecordSchema).readonly().optional().default([]),
});
