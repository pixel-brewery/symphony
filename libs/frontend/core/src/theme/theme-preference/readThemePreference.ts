// #region Imports

import { THEME_PREFERENCE_STORAGE_KEY } from './ThemePreferenceStorageKey';
import type { ThemePreference } from './ThemePreference';

// #endregion

export function readThemePreference(
  storage: Pick<Storage, 'getItem'>,
): ThemePreference | undefined {
  const stored = storage.getItem(THEME_PREFERENCE_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : undefined;
}
