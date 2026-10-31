// #region Imports

import type { IRemoteDataStatus } from '@symphony/domain-core';
import { RemoteProviderAuthenticationRequiredError } from './RemoteProviderAuthenticationRequiredError';
import { RemoteProviderRateLimitError } from './RemoteProviderRateLimitError';

// #endregion

/** Projects a safe recovery status without exposing provider error details. */
export function failedRemoteDataStatus(
  cause: unknown,
  lastSuccessfulRefreshAt?: string,
): IRemoteDataStatus {
  return {
    state: lastSuccessfulRefreshAt ? 'stale' : 'unavailable',
    ...(lastSuccessfulRefreshAt ? { lastSuccessfulRefreshAt } : {}),
    ...(cause instanceof RemoteProviderAuthenticationRequiredError
      ? { reason: 'authentication-required' as const }
      : cause instanceof RemoteProviderRateLimitError
        ? {
            reason: 'rate-limited' as const,
            ...(cause.retryAt ? { retryAt: cause.retryAt } : {}),
          }
        : {}),
  };
}
