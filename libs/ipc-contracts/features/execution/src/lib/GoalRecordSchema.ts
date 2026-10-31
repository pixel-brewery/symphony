// #region Imports

import { z } from 'zod';
import { skillFlowRoleSchema } from '@symphony/ipc-contracts-skills';
const implementationContractSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  createdByExecutionId: z.string().min(1),
  createdAt: z.string().min(1),
  deliveryGroupId: z.string().min(1).optional(),
  workItemIds: z.array(z.string().min(1)).min(2).max(10).readonly().optional(),
  workItemRevisions: z
    .record(z.string().min(1), z.number().int().nonnegative())
    .readonly()
    .optional(),
  instructions: z.string(),
  acceptanceCriteria: z.array(z.string()).readonly(),
  acceptanceCriteriaByWorkItem: z
    .record(z.string().min(1), z.array(z.string()).readonly())
    .readonly()
    .optional(),
  allowedPathPatterns: z.array(z.string().min(1)).readonly(),
  forbiddenPathPatterns: z.array(z.string().min(1)).readonly(),
  allowedCommands: z.array(z.string().min(1)).readonly(),
  maximumChangedFiles: z.number().int().nonnegative(),
  maximumDiffLines: z.number().int().nonnegative(),
});

// #endregion

export const goalRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  workItemId: z.string().min(1),
  deliveryGroupId: z.string().min(1).optional(),
  workItemIds: z.array(z.string().min(1)).min(2).max(10).readonly().optional(),
  workItemRevisions: z
    .record(z.string().min(1), z.number().int().nonnegative())
    .readonly()
    .optional(),
  assignment: z.object({
    id: z.string().min(1),
    workspaceId: z.string().min(1),
    workItemId: z.string().min(1),
    agentTeamId: z.string().min(1),
    responsibleAgentId: z.string().min(1),
    objective: z.string().min(1),
    assignedAt: z.string().min(1),
    updatedAt: z.string().min(1),
  }),
  state: z.enum([
    'planning',
    'ready',
    'implementing',
    'verifying',
    'reviewing',
    'revision-required',
    'achieved',
    'blocked',
  ]),
  currentRole: skillFlowRoleSchema,
  currentExecutionId: z.string().min(1).optional(),
  executingAgentId: z.string().min(1).optional(),
  implementationContract: implementationContractSchema.optional(),
  handoffs: z
    .array(
      z.object({
        id: z.string().min(1),
        occurredAt: z.string().min(1),
        fromAgentId: z.string().min(1),
        toAgentId: z.string().min(1),
        reason: z.string().min(1),
        executionId: z.string().min(1),
        changedFiles: z.array(z.string()).readonly(),
        completedChecks: z.array(z.string()).readonly(),
        openSteps: z.array(z.string()).readonly(),
      }),
    )
    .readonly(),
  verificationReports: z
    .array(
      z.object({
        id: z.string().min(1),
        executionId: z.string().min(1),
        recordedAt: z.string().min(1),
        state: z.enum(['passed', 'failed']),
        changedFiles: z.array(z.string()).readonly(),
        diffLines: z.number().int().nonnegative(),
        checks: z
          .array(z.object({ label: z.string().min(1), state: z.enum(['passed', 'failed']) }))
          .readonly(),
        message: z.string().optional(),
      }),
    )
    .readonly(),
  reviewDecisions: z
    .array(
      z.object({
        id: z.string().min(1),
        recordedAt: z.string().min(1),
        reviewerAgentId: z.string().min(1).optional(),
        decision: z.enum(['approved', 'revision-required', 'blocked']),
        message: z.string(),
      }),
    )
    .readonly(),
  blockedReason: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
