// #region Imports

import { InjectionToken } from '@angular/core';
import type { IArcadeGodModeState } from './IArcadeGodModeState';

// #endregion

/** Supplies Arcade-owned renderer-session state to its feature views. @public */
export const ARCADE_GOD_MODE_STATE = new InjectionToken<IArcadeGodModeState>(
  'ARCADE_GOD_MODE_STATE',
);
