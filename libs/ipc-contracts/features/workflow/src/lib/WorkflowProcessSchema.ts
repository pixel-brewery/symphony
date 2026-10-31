// #region Imports

import { z } from 'zod';
import { workflowAuditEntrySchema } from './WorkflowAuditEntrySchema';
import { workflowRecordSchema } from './WorkflowRecordSchema';

// #endregion

/** Runtime record and history of one work item, as one process view needs them together. */
export const workflowProcessSchema = z.object({
  record: workflowRecordSchema.optional(),
  audit: z.array(workflowAuditEntrySchema).readonly(),
});
