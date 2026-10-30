// #region Imports

import type { IRemoteDataStatus } from '@symphony/domain-core';

// #endregion

/** Keeps the compact Actions rail from repeating the status already owned by the active page. */
export function shouldShowActionsRemoteDataNotice(
  route: string,
  actions: IRemoteDataStatus | undefined,
  pullRequests: IRemoteDataStatus | undefined,
): boolean {
  if (!actions || actions.state === 'current') return false;
  const path = route.split(/[?#]/u)[0];
  if (path === '/main/actions') return false;
  return !(
    path === '/main/pull-requests' &&
    actions.reason === 'rate-limited' &&
    pullRequests?.state !== 'current' &&
    pullRequests?.reason === 'rate-limited'
  );
}
