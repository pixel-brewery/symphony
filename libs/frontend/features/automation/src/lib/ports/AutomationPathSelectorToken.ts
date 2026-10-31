// #region Imports

import { InjectionToken } from '@angular/core';
import type { IAutomationPathSelector } from './IAutomationPathSelector';

// #endregion

/**
 * Supplies the feature-owned consumer boundary.
 *
 * @public
 */
export const AUTOMATION_PATH_SELECTOR = new InjectionToken<IAutomationPathSelector>(
  'AUTOMATION_PATH_SELECTOR',
);
