// #region Imports

import type { IRepositoryBinding } from '@symphony/domain-workspace';

// #endregion

export interface IVerificationWorkspacePort {
  prepareVerification(
    executionId: string,
    repository: IRepositoryBinding,
    revision: string,
  ): Promise<string>;
  release(path: string): Promise<boolean>;
}
