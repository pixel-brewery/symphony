// #region Imports

import { InjectionToken } from '@angular/core';
import type { IArcadeSettingsContext } from './IArcadeSettingsContext';

// #endregion

/**
 * Supplies the Arcade card's bounded access to the authoritative settings owner.
 *
 * @public
 */
export const ARCADE_SETTINGS_CONTEXT = new InjectionToken<IArcadeSettingsContext>(
  'ARCADE_SETTINGS_CONTEXT',
);
