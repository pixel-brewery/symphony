// #region Imports

import type { IPreparedRepository, IRepositoryBinding } from '@symphony/domain-workspace';

// #endregion

export interface IRepositoryAcquisitionPort {
  inspect(
    repository: IRepositoryBinding,
    managedRoot: string,
  ): Promise<IPreparedRepository | undefined>;
  prepare(
    repository: IRepositoryBinding,
    managedRoot: string,
    signal: AbortSignal,
  ): Promise<IPreparedRepository>;
}
