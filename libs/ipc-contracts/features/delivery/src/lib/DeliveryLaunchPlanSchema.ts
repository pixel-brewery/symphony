// #region Imports

import { z } from 'zod';

// #endregion

export const deliveryLaunchPlanSchema = z.object({
  targetId: z.string().min(1),
  targetName: z.string().min(1),
  repositoryBindingId: z.string().min(1),
  workflowId: z.string().min(1),
  workflowPath: z.string().min(1),
  ref: z.string().min(1).max(256),
  revision: z.string().regex(/^[a-f0-9]{40,64}$/u),
  definitionHash: z.string().regex(/^[a-f0-9]{64}$/u),
  operationInput: z.string().min(1).optional(),
  inputs: z.record(z.string().min(1).max(128), z.string().max(4000)),
});
