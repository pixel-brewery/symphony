// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/**
 * Supplies the authoritative Arcade preference and its existing settings mutation.
 *
 * @public
 */
export interface IArcadeSettingsContext {
  /**
   * Whether the saved preference exposes Arcade in the product navigation.
   *
   * @public
   * @readonly
   */
  readonly enabled: Signal<boolean>;

  /**
   * Saves the preference through the product's authoritative settings owner.
   *
   * @param enabled - Whether Arcade should appear in navigation.
   * @returns Whether the existing settings owner accepted the change.
   * @public
   */
  setEnabled(enabled: boolean): Promise<boolean>;
}
