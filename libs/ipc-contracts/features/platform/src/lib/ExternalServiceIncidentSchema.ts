// #region Imports

import { z } from 'zod';

// #endregion

export const externalServiceIncidentSchema = z.object({
  id: z.string().min(1).max(200),
  providerName: z.string().min(1).max(100),
  severity: z.enum(['degraded', 'outage']),
  affectedComponents: z.array(z.string().min(1).max(100)).max(20).readonly(),
  affectedCapabilities: z
    .array(z.enum(['repository-sync', 'work-items', 'pull-requests', 'automation']))
    .max(4)
    .readonly(),
  updatedAt: z.iso.datetime(),
});
