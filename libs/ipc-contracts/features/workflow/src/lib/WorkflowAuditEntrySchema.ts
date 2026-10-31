// #region Imports

import { z } from 'zod';
import {
  processRoles,
  runOutcomes,
  workflowAuditKinds,
  workflowGuardIds,
} from '@symphony/domain-workflow';
import { workflowStageIdSchema } from './WorkflowStageIdSchema';

// #endregion

/**
 * One append-only audit entry. This is the "what happened" beside the record's "where are we";
 * the renderer needs both to show a work item's path through the process.
 */
export const workflowAuditEntrySchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  occurredAt: z.string(),
  kind: z.enum(workflowAuditKinds),
  fromStageId: workflowStageIdSchema.optional(),
  toStageId: workflowStageIdSchema.optional(),
  role: z.enum(processRoles).optional(),
  outcome: z.enum(runOutcomes).optional(),
  reasonCode: z.string().optional(),
  actor: z.string(),
  detail: z.string(),
  failedGuards: z.array(z.enum(workflowGuardIds)).readonly().optional(),
});
