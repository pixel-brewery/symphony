// #region Imports

import { z } from 'zod';
import { workflowProcessSchema } from './WorkflowProcessSchema';

// #endregion

export type WorkflowProcessDto = z.infer<typeof workflowProcessSchema>;
