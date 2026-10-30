// #region Imports

import { deliveryLaunchPlanSchema } from './DeliveryLaunchPlanSchema';
import { z } from 'zod';

// #endregion

/**
 * Owns the validated delivery request payloads at the desktop boundary.
 *
 * @public
 */
export const deliveryRequestSchemas = {
  'pull-request.publish': z.object({ executionId: z.string().min(1) }),
  'pull-request.branches': z.object({ repositoryBindingId: z.string().min(1) }),
  'pull-request.compare': z.object({
    repositoryBindingId: z.string().min(1),
    targetBranch: z.string().trim().min(1).max(255),
    sourceBranch: z.string().trim().min(1).max(255),
  }),
  'pull-request.create': z.object({
    repositoryBindingId: z.string().min(1),
    targetBranch: z.string().trim().min(1).max(255),
    sourceBranch: z.string().trim().min(1).max(255),
    title: z.string().trim().min(1).max(250),
    body: z.string().max(60_000).default(''),
    draft: z.boolean().default(false),
  }),
  'pull-request.update-branch': z.object({
    repositoryBindingId: z.string().min(1),
    pullRequestNumber: z.number().int().positive(),
  }),
  'delivery.refresh': z.object({}),
  'delivery.preview': z.object({
    targetId: z.string().min(1),
    ref: z.string().trim().min(1).max(256),
  }),
  'delivery.start': z.object({ operationId: z.uuid(), plan: deliveryLaunchPlanSchema }),
  'delivery.operations': z.object({}),
  'delivery.reconcile': z.object({ operationId: z.uuid() }),
} as const;
