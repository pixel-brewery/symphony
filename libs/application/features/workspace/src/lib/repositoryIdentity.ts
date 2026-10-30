// #region Imports

import type { IRepositoryBinding } from '@symphony/domain-workspace';

// #endregion

export function repositoryIdentity(repository: IRepositoryBinding): string {
  return `${repository.host}/${repository.owner}/${repository.name}`.toLowerCase();
}
