// #region Imports

import { z } from 'zod';
import { workItemRelationAssessmentSchema } from './WorkItemRelationAssessmentSchema';

// #endregion

/** Typed IPC shape of a delivery-group proposal. */
export const deliveryGroupProposalSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  deliveryContextId: z.string().min(1),
  repository: z.string().min(1),
  rootWorkItemId: z.string().min(1),
  workItemIds: z.array(z.string().min(1)).min(2).max(10).readonly(),
  revisions: z.record(z.string().min(1), z.number().int().nonnegative()).readonly(),
  assessment: workItemRelationAssessmentSchema,
  assessmentMode: z.enum(['analyzer', 'direct']).optional(),
  activationSource: z
    .enum(['automatic', 'proposal-confirmed', 'manual-drag', 'manual-select'])
    .optional(),
  operatorAttestation: z
    .object({
      attestedAt: z.string(),
      reason: z.string().optional(),
    })
    .optional(),
  state: z.enum(['open', 'rejected', 'confirmed', 'stale']),
  rejectionReason: z.string().max(4_000).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
