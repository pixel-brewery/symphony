export class AgentRoutesCoolingDownError extends Error {
  // #region Ctor

  public constructor(
    message: string,
    public readonly retryAt: string,
  ) {
    super(message);
    this.name = 'AgentRoutesCoolingDownError';
  }

  // #endregion
}
