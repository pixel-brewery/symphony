// #region Imports

import type {
  IWorkspaceDatabaseRegistryOptions,
  WorkspaceDatabaseRegistry,
} from '@symphony/persistence-core';
import type { SqliteOperationalRepositories } from './SqliteOperationalRepositories';

// #endregion

/**
 * Supplies workspace routing, optional shared connection ownership and legacy operational state.
 *
 * @public
 */
export interface IWorkspaceOperationalRepositoriesOptions extends IWorkspaceDatabaseRegistryOptions {
  readonly legacy?: SqliteOperationalRepositories;
  readonly registry?: WorkspaceDatabaseRegistry;
}
