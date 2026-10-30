// #region Imports

import { z } from 'zod';
import { workflowProcessSchema } from './WorkflowProcessSchema';
import { workflowRecordSchema } from './WorkflowRecordSchema';

// #endregion

/**
 * Owns the validated workflow response payloads at the desktop boundary.
 *
 * @public
 */
export const workflowResponseSchemas = {
  'workflow.get': workflowProcessSchema,
  'workflow.decide': z.object({ record: workflowRecordSchema.optional() }),
  'workflow.answer': z.object({ record: workflowRecordSchema.optional() }),
} as const;
