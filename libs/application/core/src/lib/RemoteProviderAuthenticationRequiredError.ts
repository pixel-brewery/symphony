/** Signals that a remote projection could not refresh because its provider credential is absent. */
export class RemoteProviderAuthenticationRequiredError extends Error {
  // #region Ctor

  public constructor(message: string) {
    super(message);
    this.name = 'RemoteProviderAuthenticationRequiredError';
  }

  // #endregion
}
