// #region Imports

import { z } from 'zod';
import { workflowRecordSchema } from './WorkflowRecordSchema';

// #endregion

export type WorkflowRecordDto = z.infer<typeof workflowRecordSchema>;
