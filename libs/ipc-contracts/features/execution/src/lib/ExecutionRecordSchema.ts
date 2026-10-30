// #region Imports

import { z } from 'zod';
import { agenticDeliveryPolicySchema } from '@symphony/configuration-automation';
import { executionKindSchema } from './ExecutionKindSchema';
import { skillFlowRoleSchema } from '@symphony/ipc-contracts-skills';
import { workItemSchema } from '@symphony/ipc-contracts-work';
const executionStateSchema = z.enum([
  'queued',
  'running',
  'waiting',
  'succeeded',
  'failed',
  'cancelled',
]);

const executionModeSchema = z.enum(['manual', 'ai']);

// #endregion

export const executionRecordSchema = z.object({
  id: z.string(),
  workspaceId: z.string().min(1).optional(),
  bindingSnapshot: z
    .object({
      workspaceId: z.string().min(1),
      deliveryContextId: z.string().min(1),
      workItemSourceId: z.string().min(1),
      workTrackingConnectionId: z.string().min(1),
      repositoryBindingIds: z.array(z.string().min(1)).readonly(),
      sourceControlConnectionIds: z.array(z.string().min(1)).readonly(),
      ciBindingIds: z.array(z.string().min(1)).readonly(),
      skillFlowRole: skillFlowRoleSchema,
      agentTeamId: z.string().min(1),
      positionId: z.string().min(1),
      agentRoutePolicyId: z.string().min(1),
      agentRouteCandidateId: z.string().min(1).optional(),
      aiConnectionId: z.string().min(1),
      agentProfileId: z.string().min(1),
      model: z.string().min(1).nullable(),
      reasoningEffort: z.string().min(1).nullable(),
      costPolicy: z.enum(['any', 'free-only', 'local-only']).optional(),
      contractVersion: z.number().int().positive().optional(),
    })
    .optional(),
  workItemId: z.string(),
  deliveryGroupId: z.string().min(1).optional(),
  workItemIds: z.array(z.string().min(1)).min(2).max(10).readonly().optional(),
  workItemRevisions: z
    .record(z.string().min(1), z.number().int().nonnegative())
    .readonly()
    .optional(),
  workflowId: z.string(),
  mode: executionModeSchema.optional(),
  skillId: z.string().optional(),
  skillFlowRole: skillFlowRoleSchema.optional(),
  skillSnapshot: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
      displayName: z.string().min(1),
      description: z.string(),
      digest: z.string().min(1),
      instructions: z.string(),
    })
    .optional(),
  kind: executionKindSchema.optional(),
  parentExecutionId: z.string().optional(),
  request: z.string().optional(),
  state: executionStateSchema,
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  workspacePath: z.string().optional(),
  workspaceReference: z.string().optional(),
  pullRequest: z
    .object({
      number: z.number().int().positive(),
      externalUrl: z.url(),
      branchUrl: z.url(),
    })
    .optional(),
  continuationReference: z.string().min(1).optional(),
  attempt: z.number().int().positive().optional(),
  pause: z
    .object({
      reason: z.enum(['lifecycle', 'operator']),
      pausedAt: z.string().min(1),
      resumeRequestedAt: z.string().min(1).optional(),
    })
    .optional(),
  workItemSnapshot: workItemSchema.optional(),
  workItemSnapshots: z.array(workItemSchema).min(2).max(10).readonly().optional(),
  automationSignalId: z.string().min(1).optional(),
  automationOrigin: z.enum(['remote', 'autonomy', 'agentic-delivery', 'workflow']).optional(),
  agenticDeliveryId: z.string().min(1).optional(),
  agenticDeliveryPolicy: agenticDeliveryPolicySchema.optional(),
  preserveWorkspace: z.boolean().optional(),
  triggeredBy: z.string().min(1).optional(),
  workItemClaim: z
    .object({
      id: z.string().min(1),
      workItemId: z.string().min(1),
      action: z.enum(['analyze', 'solve']),
      owner: z.string().min(1),
      acquiredAt: z.string().min(1),
      releasedAt: z.string().min(1).optional(),
    })
    .optional(),
  workItemClaims: z
    .array(
      z.object({
        id: z.string().min(1),
        workItemId: z.string().min(1),
        action: z.enum(['analyze', 'solve']),
        owner: z.string().min(1),
        acquiredAt: z.string().min(1),
        leaseUntil: z.string().min(1).optional(),
        heartbeatAt: z.string().min(1).optional(),
        claimVersion: z.number().int().nonnegative().optional(),
        releasedAt: z.string().min(1).optional(),
      }),
    )
    .min(1)
    .max(10)
    .readonly()
    .optional(),
  lastHeartbeatAt: z.string().optional(),
  summary: z.string().optional(),
  error: z.string().optional(),
  tokenUsage: z
    .object({
      input: z.number().int().nonnegative(),
      cachedInput: z.number().int().nonnegative(),
      output: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    })
    .optional(),
});
