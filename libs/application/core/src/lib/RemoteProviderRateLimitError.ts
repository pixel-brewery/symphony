/** Signals that a remote projection must wait for its provider request budget to recover. */
export class RemoteProviderRateLimitError extends Error {
  // #region Ctor

  public constructor(
    message: string,
    public readonly retryAt?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'RemoteProviderRateLimitError';
  }

  // #endregion
}
