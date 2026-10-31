// #region Imports

import { z } from 'zod';
import { repositoryExecutionCapabilitySchema } from '@symphony/ipc-contracts-workspace';
import { verificationStepSchema } from './VerificationStepSchema';

// #endregion

export const verificationPlanSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  repositoryBindingId: z.string().min(1),
  repositoryIdentity: z.string().min(1),
  revision: z.string().min(1),
  createdAt: z.string().min(1),
  technologies: z.array(z.string().min(1)).readonly(),
  evidence: z
    .array(z.object({ path: z.string().min(1), reason: z.string().min(1) }))
    .max(1_000)
    .readonly(),
  capabilities: z.array(repositoryExecutionCapabilitySchema).readonly(),
  steps: z.array(verificationStepSchema).min(1).max(100).readonly(),
});
