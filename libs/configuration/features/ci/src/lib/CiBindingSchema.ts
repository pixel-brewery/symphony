// #region Imports

import { z } from 'zod';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const ciBindingSchema = z.object({
  id: identifierSchema,
  workspaceId: identifierSchema,
  repositoryBindingId: identifierSchema,
  sourceControlConnectionId: identifierSchema,
  provider: z.enum(['github-actions', 'simulated']),
  displayName: identifierSchema,
  enabled: z.boolean(),
  agenticDeliveryEnabled: z.boolean().default(false),
});
