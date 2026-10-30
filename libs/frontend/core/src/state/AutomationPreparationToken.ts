// #region Imports

import { InjectionToken } from '@angular/core';
import type { IAutomationPreparation } from './IAutomationPreparation';

// #endregion

/**
 * Supplies the included Automation feature's repository preparation policy.
 *
 * @public
 */
export const AUTOMATION_PREPARATION = new InjectionToken<IAutomationPreparation>(
  'AUTOMATION_PREPARATION',
);
