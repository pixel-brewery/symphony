// #region Imports

import { z } from 'zod';
import { deliveryTargetSchema } from '@symphony/configuration-delivery';

// #endregion

export const deliverySnapshotSchema = z.object({
  targets: z.array(deliveryTargetSchema).max(100).readonly(),
  evidence: z
    .array(
      z.object({
        id: z.string().min(1),
        targetId: z.string().min(1),
        workspaceId: z.string().min(1),
        repositoryBindingId: z.string().min(1),
        kind: z.enum(['deployment', 'publication', 'installation']),
        revision: z.string().min(1),
        version: z.string().optional(),
        state: z.enum(['pending', 'in-progress', 'succeeded', 'failed', 'inactive']),
        deployedAt: z.iso.datetime().optional(),
        observedAt: z.iso.datetime(),
        externalUrl: z.url().optional(),
        workItemIds: z.array(z.string()).max(10000).readonly(),
      }),
    )
    .max(10000)
    .readonly(),
  refreshedAt: z.iso.datetime(),
  errors: z.array(z.object({ targetId: z.string(), message: z.string() })).readonly(),
});
