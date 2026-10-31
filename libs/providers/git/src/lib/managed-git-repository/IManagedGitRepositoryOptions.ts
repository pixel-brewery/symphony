// #region Imports

import type { IRepositoryBinding } from '@symphony/domain-workspace';

// #endregion

export interface IManagedGitRepositoryOptions {
  readonly token: (repository: IRepositoryBinding) => Promise<string | undefined>;
}
