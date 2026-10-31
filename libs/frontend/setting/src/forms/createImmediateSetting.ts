// #region Imports

import { linkedSignal, signal } from '@angular/core';
import type { IImmediateSetting } from './IImmediateSetting';

// #endregion

/**
 * Connects a control to a stored setting so it applies when it changes: toggles, segments and
 * selects on change, number boxes on commit (`(change)`, not `(input)`). A failed save restores
 * the previous value in the control, as Settings has no per-card `Save` button to retry with.
 *
 * ```ts
 * readonly keepAwake = createImmediateSetting(() => this.settings()?.runtime.keepAwake ?? false);
 * setKeepAwake(enabled: boolean) {
 *   void this.keepAwake.apply(enabled, (value) => this.store.saveSettings({ …, keepAwake: value }));
 * }
 * ```
 *
 * @param stored - Reads the stored value; re-read after every save.
 * @param equal - Compares two values; a change to an equal value is not saved.
 * @returns The control's value and the `apply` command.
 * @public
 */
export function createImmediateSetting<TValue>(
  stored: () => TValue,
  equal: (left: TValue, right: TValue) => boolean = Object.is,
): IImmediateSetting<TValue> {
  const value = linkedSignal<TValue>(stored);
  const saving = signal(false);
  return {
    value: value.asReadonly(),
    saving: saving.asReadonly(),
    async apply(next: TValue, persist: (next: TValue) => Promise<boolean>): Promise<boolean> {
      if (equal(next, stored())) {
        value.set(next);
        return true;
      }
      value.set(next);
      saving.set(true);
      try {
        const saved = await persist(next);
        if (!saved) value.set(stored());
        return saved;
      } catch (cause) {
        value.set(stored());
        throw cause;
      } finally {
        saving.set(false);
      }
    },
  };
}
