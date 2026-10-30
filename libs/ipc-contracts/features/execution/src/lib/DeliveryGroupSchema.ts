// #region Imports

import { z } from 'zod';

// #endregion

/** Typed IPC shape of a provider-neutral delivery group. */
export const deliveryGroupSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  deliveryContextId: z.string().min(1),
  repository: z.string().min(1),
  rootWorkItemId: z.string().min(1),
  workItemIds: z.array(z.string().min(1)).min(2).max(10).readonly(),
  revisions: z.record(z.string().min(1), z.number().int().nonnegative()).readonly(),
  stageId: z.string().min(1).optional(),
  state: z.enum(['synchronizing', 'active', 'paused', 'dissolving', 'dissolved', 'completed']),
  activationSource: z.enum(['automatic', 'proposal-confirmed', 'manual-drag', 'manual-select']),
  proposalId: z.string().min(1).optional(),
  operatorAttestation: z
    .object({
      attestedAt: z.string(),
      reason: z.string().optional(),
    })
    .optional(),
  pauseReason: z
    .enum(['claim-conflict', 'provider-drift', 'provider-transition', 'revision-drift'])
    .optional(),
  pullRequest: z
    .object({
      number: z.number().int().positive(),
      externalUrl: z.url(),
      branchUrl: z.url(),
    })
    .optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  completedAt: z.string().min(1).optional(),
  dissolvedAt: z.string().min(1).optional(),
});
