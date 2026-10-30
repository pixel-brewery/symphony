// #region Imports

import { InjectionToken } from '@angular/core';
import type { ICiSettingsConfiguration } from './ICiSettingsConfiguration';

// #endregion

/** The existing settings writer as consumed by CI's actual configuration commands. @public */
export const CI_SETTINGS_CONFIGURATION = new InjectionToken<ICiSettingsConfiguration>(
  'CI_SETTINGS_CONFIGURATION',
);
