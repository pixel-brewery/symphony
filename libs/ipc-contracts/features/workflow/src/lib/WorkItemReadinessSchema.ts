// #region Imports

import { z } from 'zod';
import { riskClasses } from '@symphony/domain-workflow';

// #endregion

/**
 * What the readiness guards of an implementing stage would find, projected for a surface. The
 * supervisor record stays inside the orchestrator; only these facts cross the boundary.
 */
export const workItemReadinessSchema = z.object({
  workItemId: z.string().min(1),
  analysisStored: z.boolean(),
  readyForSolve: z.boolean(),
  riskClass: z.enum(riskClasses).optional(),
  openDecisions: z.array(z.string()).readonly(),
  hardDependencyIds: z.array(z.string()).readonly(),
  running: z.boolean(),
});
