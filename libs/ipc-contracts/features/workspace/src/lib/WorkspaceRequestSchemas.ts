// #region Imports

import { z } from 'zod';

// #endregion

/**
 * Owns the validated workspace request payloads at the desktop boundary.
 *
 * @public
 */
export const workspaceRequestSchemas = {
  'workspaces.clear': z.object({}),
  'workspaces.delete': z.object({ workspaceId: z.string().min(1) }),
  'workspaces.export': z.object({
    workspaceId: z.string().min(1),
    destinationRoot: z.string().min(1).max(4_096),
  }),
  'workspaces.import': z.object({ sourcePath: z.string().min(1).max(4_096) }),
  'repositories.runtime.list': z.object({ repositoryBindingId: z.string().min(1).optional() }),
  'repositories.prepare': z.object({ repositoryBindingId: z.string().min(1) }),
  'repositories.trust.grant-agent': z.object({ repositoryBindingId: z.string().min(1) }),
  'repositories.trust.revoke': z.object({ repositoryBindingId: z.string().min(1) }),
} as const;
