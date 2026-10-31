// #region Imports

import { z } from 'zod';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const deliveryContextSchema = z.object({
  id: identifierSchema,
  workspaceId: identifierSchema,
  displayName: identifierSchema,
  workItemSourceIds: z.array(identifierSchema),
  repositoryBindingIds: z.array(identifierSchema),
  ciBindingIds: z.array(identifierSchema),
  agentTeamId: identifierSchema,
  defaultRepositoryBindingId: identifierSchema.optional(),
  enabled: z.boolean(),
});
