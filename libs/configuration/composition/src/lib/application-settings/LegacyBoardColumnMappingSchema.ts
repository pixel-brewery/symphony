// #region Imports

import { z } from 'zod';
import { identifierSchema } from '@symphony/configuration-core';
import { legacyWorkflowStates } from './LegacyWorkflowStates';

// #endregion

export const legacyBoardColumnMappingSchema = z.object({
  columnId: identifierSchema,
  workflowState: z.enum(legacyWorkflowStates),
});
