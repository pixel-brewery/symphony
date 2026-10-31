// #region Imports

import { InjectionToken } from '@angular/core';
import type { ICiSettingsContext } from './ICiSettingsContext';

// #endregion

/** Existing configuration and capacity projection read by CI settings. @public */
export const CI_SETTINGS_CONTEXT = new InjectionToken<ICiSettingsContext>('CI_SETTINGS_CONTEXT');
