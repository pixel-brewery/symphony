/**
 * Fatal host progress failure; another provider must never replay the operation.
 *
 * @public
 */
export class SynapseHostProgressError extends Error {
  // #region Ctor

  /**
   * Creates a safe terminal error while retaining the private host cause.
   *
   * @param cause - Storage/progress callback failure; never rendered as raw output.
   *
   * @public
   */
  public constructor(cause: unknown) {
    super('Symphony could not persist the AI execution progress.', { cause });
    this.name = 'SynapseHostProgressError';
  }

  // #endregion
}
