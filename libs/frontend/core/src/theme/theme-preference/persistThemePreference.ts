// #region Imports

import { THEME_PREFERENCE_STORAGE_KEY } from './ThemePreferenceStorageKey';
import type { ThemePreference } from './ThemePreference';

// #endregion

export function persistThemePreference(
  preference: ThemePreference,
  storage: Pick<Storage, 'setItem'>,
): void {
  storage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
}
