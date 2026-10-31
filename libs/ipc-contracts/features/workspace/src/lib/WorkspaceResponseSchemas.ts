// #region Imports

import { z } from 'zod';
import { applicationSettingsSchema } from '@symphony/configuration-composition';
import { repositoryRuntimeStatusSchema } from './RepositoryRuntimeStatusSchema';
import { workspaceCleanupResultSchema } from './WorkspaceCleanupResultSchema';
import { workspaceExportResultSchema } from './WorkspaceExportResultSchema';
import { workspaceImportResultSchema } from './WorkspaceImportResultSchema';

// #endregion

/**
 * Owns the validated workspace response payloads at the desktop boundary.
 *
 * @public
 */
export const workspaceResponseSchemas = {
  'workspaces.clear': workspaceCleanupResultSchema,
  'workspaces.delete': applicationSettingsSchema,
  'workspaces.export': workspaceExportResultSchema,
  'workspaces.import': workspaceImportResultSchema,
  'repositories.runtime.list': z.array(repositoryRuntimeStatusSchema).readonly(),
  'repositories.prepare': repositoryRuntimeStatusSchema,
  'repositories.trust.grant-agent': repositoryRuntimeStatusSchema,
  'repositories.trust.revoke': repositoryRuntimeStatusSchema,
} as const;
