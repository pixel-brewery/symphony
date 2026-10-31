// #region Imports

import type { IRemoteDataStatus } from '@symphony/domain-core';

// #endregion

/** Projects the status of an already stored remote read without changing its freshness. */
export function cachedRemoteDataStatus(refreshedAt: string, fresh: boolean): IRemoteDataStatus {
  return {
    state: fresh ? 'current' : 'stale',
    lastSuccessfulRefreshAt: refreshedAt,
  };
}
