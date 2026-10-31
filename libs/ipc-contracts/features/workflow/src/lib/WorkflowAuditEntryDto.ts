// #region Imports

import { z } from 'zod';
import { workflowAuditEntrySchema } from './WorkflowAuditEntrySchema';

// #endregion

export type WorkflowAuditEntryDto = z.infer<typeof workflowAuditEntrySchema>;
