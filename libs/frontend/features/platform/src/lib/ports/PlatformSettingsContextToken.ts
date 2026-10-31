// #region Imports

import { InjectionToken } from '@angular/core';
import type { IPlatformSettingsContext } from './IPlatformSettingsContext';

// #endregion

/**
 * Supplies the feature-owned consumer boundary.
 *
 * @public
 */
export const PLATFORM_SETTINGS_CONTEXT = new InjectionToken<IPlatformSettingsContext>(
  'PLATFORM_SETTINGS_CONTEXT',
);
