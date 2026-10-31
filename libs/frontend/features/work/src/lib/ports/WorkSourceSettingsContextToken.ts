// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkSourceSettingsContext } from './IWorkSourceSettingsContext';

// #endregion

/** Work's consumed source configuration and account operations. @public */
export const WORK_SOURCE_SETTINGS_CONTEXT = new InjectionToken<IWorkSourceSettingsContext>(
  'WORK_SOURCE_SETTINGS_CONTEXT',
);
