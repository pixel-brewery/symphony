/**
 * A presenter-owned cancellation reference for asynchronous work.
 *
 * @public
 */
export type AbortRef = {
  // #region Properties

  /** Signal passed to cancellable operations. */
  readonly signal: AbortSignal;

  // #endregion

  // #region Methods

  /** Cancels the currently owned operations. */
  abort(): void;

  // #endregion
};
