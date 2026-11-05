// #region Imports

import type { ApplicationLocalization } from '../ApplicationLocalization';

// #endregion

type LocalizationOwner = Pick<ApplicationLocalization, 'translate'> &
  Partial<Pick<ApplicationLocalization, 'language'>>;

/**
 * Makes the canonical application translator available to framework-neutral label projections.
 *
 * @public
 */
export class LabelLocalizationBinding {
  // #region Fields

  private static _current: LocalizationOwner | null = null;

  // #endregion

  // #region Properties

  /**
   * The application-owned translator, or null outside an initialized application.
   *
   * @public
   * @readonly
   */
  public static get current(): LocalizationOwner | null {
    return this._current;
  }

  // #endregion

  // #region Methods

  /**
   * Binds one application and returns cleanup that cannot clear a newer application binding.
   *
   * @param localization - The existing application localization owner.
   * @returns Cleanup for the application that created this binding.
   * @public
   */
  public static bind(localization: LocalizationOwner): () => void {
    this._current = localization;
    return () => {
      if (this._current === localization) this._current = null;
    };
  }

  // #endregion
}
