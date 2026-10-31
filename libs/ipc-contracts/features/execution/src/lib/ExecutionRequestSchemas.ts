// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Owns the validated execution request payloads at the desktop boundary.
 *
 * @public
 */
export const executionRequestSchemas = {
  'execution-state.get': z.object({}),
  'analyzer.start': z.object({
    simulateFailure: z.boolean().default(false),
    workItemId: z.string().min(1).optional(),
    prompt: z.string().trim().min(1).max(20_000).optional(),
    executionApproval: z.enum(['once', 'repository']).optional(),
  }),
  'analysis.complete-manually': z.object({
    workItemId: z.string().min(1),
    summary: z.string().trim().min(1).max(1_000_000),
  }),
  'solver.start': z.object({
    simulateFailure: z.boolean().default(false),
    workItemId: z.string().min(1),
    feedback: z.string().trim().min(1).max(20_000).optional(),
    executionApproval: z.enum(['once', 'repository']).optional(),
  }),
  'work-items.delegate': z.object({
    workItemId: z.string().min(1),
    agentTeamId: z.string().min(1).optional(),
    responsibleAgentId: z.string().min(1).optional(),
    objective: z.string().trim().min(1).max(20_000).optional(),
  }),
  'goals.review': z.object({
    workItemId: z.string().min(1),
    decision: z.enum(['approved', 'revision-required', 'blocked']),
    message: z.string().trim().max(20_000).default(''),
  }),
  'delivery-groups.assess': z.object({
    workItemIds: z.array(z.string().min(1)).min(2).max(10).readonly(),
    rootWorkItemId: z.string().min(1),
    activationSource: z.enum(['automatic', 'proposal-confirmed', 'manual-drag', 'manual-select']),
    assessmentMode: z.enum(['analyzer', 'direct']).default('analyzer'),
  }),
  'delivery-groups.create-direct': z.object({
    workItemIds: z.array(z.string().min(1)).min(2).max(10).readonly(),
    rootWorkItemId: z.string().min(1),
    activationSource: z.enum(['manual-drag', 'manual-select']),
  }),
  'delivery-groups.confirm': z.object({
    proposalId: z.string().min(1),
    attestation: z.object({ reason: z.string().trim().max(4_000).optional() }).optional(),
  }),
  'delivery-groups.reject': z.object({
    proposalId: z.string().min(1),
    reason: z.string().trim().max(4_000).optional(),
  }),
  'delivery-groups.dissolve': z.object({ deliveryGroupId: z.string().min(1) }),
  'delivery-groups.align': z.object({ deliveryGroupId: z.string().min(1) }),
  'solution.complete-manually': z.object({
    workItemId: z.string().min(1),
    summary: z.string().trim().min(1).max(1_000_000),
  }),
  'execution-queue.remove': z.object({ entryId: z.string().min(1) }),
  'execution.cancel': z.object({ executionId: z.string().min(1) }),
  'execution.pause': z.object({ executionId: z.string().min(1) }),
  'execution.resume': z.object({ executionId: z.string().min(1) }),
} as const;
