// #region Imports

import { InjectionToken } from '@angular/core';
import type { ITeamSettingsContext } from './ITeamSettingsContext';

// #endregion

/** Explicit consumed dependencies of the Team feature's settings surfaces. @public */
export const TEAM_SETTINGS_CONTEXT = new InjectionToken<ITeamSettingsContext>(
  'TeamSettingsContext',
);
