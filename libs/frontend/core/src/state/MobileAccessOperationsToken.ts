// #region Imports

import { InjectionToken } from '@angular/core';
import type { IMobileAccessOperations } from './IMobileAccessOperations';

// #endregion

/**
 * Supplies the included Mobile feature's desktop access owner.
 *
 * @public
 */
export const MOBILE_ACCESS_OPERATIONS = new InjectionToken<IMobileAccessOperations>(
  'MOBILE_ACCESS_OPERATIONS',
);
