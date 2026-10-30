// #region Imports

import { RemoteProviderRateLimitError } from '@symphony/application-core';

// #endregion

export class GitHubRateLimitError extends RemoteProviderRateLimitError {
  // #region Ctor

  public constructor(
    message: string,
    public override readonly retryAt: string,
    options?: ErrorOptions,
  ) {
    super(message, retryAt, options);
    this.name = 'GitHubRateLimitError';
  }

  // #endregion
}
