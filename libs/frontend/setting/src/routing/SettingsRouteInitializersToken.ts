// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISettingsRouteInitializer } from './ISettingsRouteInitializer';

// #endregion

/** Static feature lifecycle contributions to the Settings route. @public */
export const SETTINGS_ROUTE_INITIALIZERS = new InjectionToken<readonly ISettingsRouteInitializer[]>(
  'SettingsRouteInitializers',
);
