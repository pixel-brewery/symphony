// #region Imports

import type { ThemeMode } from '@pixel-brewery/mosaik-themes';
import type { ThemePreference } from './ThemePreference';

// #endregion

export function resolveThemeMode(
  preference: ThemePreference | undefined,
  prefersDark: boolean,
): ThemeMode {
  if (preference === 'dark' || preference === 'light') return preference;
  return prefersDark ? 'dark' : 'light';
}
