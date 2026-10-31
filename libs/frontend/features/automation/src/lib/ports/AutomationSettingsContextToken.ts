// #region Imports

import { InjectionToken } from '@angular/core';
import type { IAutomationSettingsContext } from './IAutomationSettingsContext';

// #endregion

/**
 * Supplies the feature-owned consumer boundary.
 *
 * @public
 */
export const AUTOMATION_SETTINGS_CONTEXT = new InjectionToken<IAutomationSettingsContext>(
  'AUTOMATION_SETTINGS_CONTEXT',
);
