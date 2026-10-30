// #region Imports

import { z } from 'zod';
import { processRoles, runOutcomes, workflowRuntimeStates } from '@symphony/domain-workflow';
import { workflowStageIdSchema } from './WorkflowStageIdSchema';

// #endregion

export const workflowRecordSchema = z.object({
  workItemId: z.string().min(1),
  stageId: workflowStageIdSchema,
  runtimeState: z.enum(workflowRuntimeStates),
  activeRun: z
    .object({
      id: z.string(),
      role: z.enum(processRoles),
      startedAt: z.string(),
      attempt: z.number(),
    })
    .optional(),
  claim: z
    .object({
      runId: z.string(),
      role: z.enum(processRoles),
      owner: z.string(),
      leaseUntil: z.string(),
      claimVersion: z.number(),
    })
    .optional(),
  revisions: z.record(z.string(), z.string()).optional(),
  routing: z
    .object({
      lastOutcome: z.enum(runOutcomes).optional(),
      lastReasonCode: z.string().optional(),
      blockedReason: z.string().optional(),
      blockedSince: z.string().optional(),
      blockingWorkItemIds: z.array(z.string()).readonly().optional(),
      nextRetryAt: z.string().optional(),
      resumeRole: z.enum(processRoles).optional(),
      closureReason: z.string().optional(),
    })
    .optional(),
  humanRequest: z
    .object({
      id: z.string(),
      question: z.string(),
      rationale: z.string(),
      options: z.array(z.string()).readonly(),
      consequences: z.array(z.string()).readonly(),
      raisedAt: z.string(),
      remindedAt: z.string().optional(),
      escalatedAt: z.string().optional(),
    })
    .optional(),
  updatedAt: z.string(),
});
