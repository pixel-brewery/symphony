// #region Imports

import type {
  IWorkspaceDatabaseRegistryOptions,
  WorkspaceDatabaseRegistry,
} from '@symphony/persistence-core';

// #endregion

/**
 * Supplies shared workspace storage and the repository-to-workspace routing policy.
 *
 * @public
 */
export interface IWorkspaceRuntimeRepositoriesOptions extends IWorkspaceDatabaseRegistryOptions {
  readonly workspaceForRepository: (repositoryBindingId: string) => string | undefined;
  readonly registry?: WorkspaceDatabaseRegistry;
}
