// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Owns the validated workflow request payloads at the desktop boundary.
 *
 * @public
 */
export const workflowRequestSchemas = {
  'workflow.get': z.object({
    workItemId: z.string().min(1),
    /** Most recent audit entries to return; the trail grows with every run. */
    auditLimit: z.number().int().min(1).max(1_000).optional(),
  }),
  'workflow.decide': z.object({
    workItemId: z.string().min(1),
    optionId: z.string().min(1),
    note: z.string().trim().max(4_000).optional(),
    commitSha: z.string().trim().min(1).max(64).optional(),
  }),
  'workflow.answer': z.object({
    workItemId: z.string().min(1),
    questionId: z.string().min(1),
    /** One of the question's offered options; omitted when the question is dismissed. */
    option: z.string().trim().min(1).max(300).optional(),
    note: z.string().trim().max(4_000).optional(),
  }),
} as const;
