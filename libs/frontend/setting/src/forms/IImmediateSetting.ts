// #region Imports

import type { Signal } from '@angular/core';

// #endregion

/**
 * One control of a Settings section that applies its value as soon as it changes.
 *
 * @typeParam TValue - The setting's value.
 * @public
 */
export interface IImmediateSetting<TValue> {
  /**
   * The value to bind the control to: the stored value, the new value while it is being saved,
   * and the stored value again when saving failed.
   *
   * @public
   * @readonly
   */
  readonly value: Signal<TValue>;
  /**
   * Whether a change is being saved.
   *
   * @public
   * @readonly
   */
  readonly saving: Signal<boolean>;
  /**
   * Shows `next` at once, saves it, and restores the stored value when saving fails.
   *
   * @param next - The value the control changed to.
   * @param persist - Saves the value; resolves `false` when it could not be saved (the settings
   * writer already shows `Unable to save settings.`).
   * @returns Whether the value was saved; `true` without saving when it did not change.
   * @public
   */
  apply(next: TValue, persist: (next: TValue) => Promise<boolean>): Promise<boolean>;
}
