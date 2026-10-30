// #region Imports

import type { IRemoteDataStatus } from '@symphony/domain-core';

// #endregion

/**
 * A stale global projection is only a usable cache when it contains data for the selected
 * workspace scope. Items cached for another workspace must not turn an empty active scope into
 * a successful empty result.
 */
export function isWorkItemScopeUnavailable(
  status: IRemoteDataStatus | undefined,
  scopedItemCount: number,
): boolean {
  return status?.state === 'unavailable' || (status?.state === 'stale' && scopedItemCount === 0);
}
