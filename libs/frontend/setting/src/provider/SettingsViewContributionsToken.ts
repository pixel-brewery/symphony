// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISettingsViewContribution } from '../models/ISettingsViewContribution';

// #endregion

/**
 * Collects static feature configuration for the existing native slot providers.
 *
 * @public
 */
export const SETTINGS_VIEW_CONTRIBUTIONS = new InjectionToken<readonly ISettingsViewContribution[]>(
  'SETTINGS_VIEW_CONTRIBUTIONS',
);
