// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/**
 * Lifecycle and loading contract shared by all ViewPresenters.
 *
 * @public
 */
export interface IViewPresenter {
  // #region Properties

  /** Whether the presenter has been initialized. */
  readonly initialized: Signal<boolean>;

  /** Whether the presenter has been disposed. */
  readonly disposed: Signal<boolean>;

  /** Whether at least one presenter operation is loading. */
  readonly isLoading: Signal<boolean>;

  // #endregion

  // #region Methods

  /** Initializes the presenter. */
  initialize(): void;

  /** Disposes the presenter. */
  dispose(): void;

  // #endregion
}
