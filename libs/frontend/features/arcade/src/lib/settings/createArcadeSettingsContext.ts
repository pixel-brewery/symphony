// #region Imports

import { computed } from '@angular/core';
import type { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { IArcadeSettingsContext } from './IArcadeSettingsContext';

// #endregion

/**
 * Adapts the current product settings owner without creating another writable preference.
 *
 * @param store - Existing settings projection and aggregate save operation.
 * @returns Arcade's bounded preference projection and command.
 * @public
 */
export function createArcadeSettingsContext(
  store: Pick<ConfigurationStore, 'settings' | 'saveSettings'>,
): IArcadeSettingsContext {
  return {
    enabled: computed(() => store.settings()?.user.arcadeEnabled ?? false),
    async setEnabled(enabled: boolean): Promise<boolean> {
      const current = store.settings();
      if (!current) throw new Error('Application settings are not loaded.');
      return store.saveSettings({
        ...current,
        user: { ...current.user, arcadeEnabled: enabled },
      });
    },
  };
}
