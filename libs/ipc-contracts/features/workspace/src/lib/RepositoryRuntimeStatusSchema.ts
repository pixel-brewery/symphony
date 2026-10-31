// #region Imports

import { z } from 'zod';
import { repositoryExecutionCapabilitySchema } from './RepositoryExecutionCapabilitySchema';

// #endregion

export const repositoryRuntimeStatusSchema = z.object({
  repositoryBindingId: z.string().min(1),
  workspaceId: z.string().min(1),
  displayName: z.string().min(1),
  repositoryIdentity: z.string().min(1),
  preparation: z.discriminatedUnion('state', [
    z.object({ state: z.literal('unprepared') }),
    z.object({
      state: z.literal('prepared'),
      path: z.string().min(1),
      revision: z.string().min(1),
      managed: z.boolean(),
    }),
  ]),
  trust: z.object({
    state: z.enum(['restricted', 'trusted']),
    capabilities: z.array(repositoryExecutionCapabilitySchema).readonly(),
    grantedAt: z.string().min(1).optional(),
  }),
});
