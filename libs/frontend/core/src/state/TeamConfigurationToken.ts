// #region Imports

import { InjectionToken } from '@angular/core';
import type { ITeamConfiguration } from './ITeamConfiguration';

// #endregion

/** Optional Team configuration capability consumed by other explicitly composed features. @public */
export const TEAM_CONFIGURATION = new InjectionToken<ITeamConfiguration>('TeamConfiguration');
