// #region Imports

import { ciDispatchInputSchema } from './CiDispatchInputSchema';
import { z } from 'zod';

// #endregion

export const ciWorkflowSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  ciBindingId: z.string().min(1),
  repositoryBindingId: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  state: z.enum(['active', 'disabled']),
  defaultBranch: z.string().min(1),
  supportsManualDispatch: z.boolean(),
  inputs: z.array(ciDispatchInputSchema).max(100).readonly().optional(),
  externalUrl: z.url().optional(),
});
