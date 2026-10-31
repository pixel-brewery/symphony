/**
 * Terminal host progress failure; provider selection must not replay this work.
 *
 * @internal
 */
export class AgentRouteProgressError extends Error {
  // #region Ctor

  /**
   * Retains the private persistence failure behind a safe host message.
   *
   * @param cause - Original host progress or storage failure.
   *
   * @internal
   */
  public constructor(cause: unknown) {
    super('Unable to persist AI route progress.', { cause });
    this.name = 'AgentRouteProgressError';
  }

  // #endregion
}
