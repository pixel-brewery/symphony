// #region Imports

import { mobileEmployeeSchema } from './MobileEmployeeSchema';
import { z } from 'zod';
import { mobileBoardColumnSchema } from './MobileBoardColumnSchema';
import { mobileExecutionSchema } from './MobileExecutionSchema';
import { mobileMergeRequestSchema } from './MobileMergeRequestSchema';
import { mobileQueueEntrySchema } from './MobileQueueEntrySchema';
import { mobileTicketSchema } from './MobileTicketSchema';

// #endregion

export const mobileSnapshotSchema = z
  .object({
    version: z.literal(1),
    desktopName: z.string().min(1).max(200),
    remoteAutomationEnabled: z.boolean().default(false),
    generatedAt: z.string(),
    boardColumns: z.array(mobileBoardColumnSchema).readonly(),
    employees: z.array(mobileEmployeeSchema).max(200).readonly().optional(),
    tickets: z.array(mobileTicketSchema).readonly(),
    mergeRequests: z.array(mobileMergeRequestSchema).readonly().default([]),
    executions: z.array(mobileExecutionSchema).readonly(),
    executionQueue: z.array(mobileQueueEntrySchema).readonly().default([]),
  })
  .strict();
