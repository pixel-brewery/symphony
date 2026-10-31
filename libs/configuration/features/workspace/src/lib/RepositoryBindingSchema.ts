// #region Imports

import { z } from 'zod';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

export const repositoryBindingSchema = z.object({
  id: identifierSchema,
  workspaceId: identifierSchema,
  sourceControlConnectionId: identifierSchema,
  displayName: identifierSchema,
  provider: z.enum(['github', 'simulated']),
  host: identifierSchema,
  owner: identifierSchema,
  name: identifierSchema,
  defaultBranch: identifierSchema,
  localPath: z.string(),
  enabled: z.boolean(),
  /**
   * Repository-owned provisioning executed in the guest after the selected image baseline.
   * System requirements belong to the repository, never to Symphony source.
   */
  localCiSetupScript: z.string().max(32_768).optional(),
});
