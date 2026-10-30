// #region Imports

import { InjectionToken } from '@angular/core';
import type { ThemeMode } from '@pixel-brewery/mosaik-themes';

// #endregion

export const MOBILE_THEME_APPLIER = new InjectionToken<(mode: ThemeMode) => void>(
  'MOBILE_THEME_APPLIER',
);
