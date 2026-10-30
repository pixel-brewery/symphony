/**
 * Reference used by commands and presenter operations to balance loading state.
 *
 * @public
 */
export type LoadingRef = {
  // #region Methods

  /** Enters a loading operation. */
  enter(): void;

  /** Leaves a loading operation. */
  leave(): void;

  // #endregion
};
