// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkRefresh } from './IWorkRefresh';

// #endregion

/**
 * Supplies Work's bounded refresh dependency.
 *
 * @public
 */
export const WORK_REFRESH = new InjectionToken<IWorkRefresh>('WORK_REFRESH');
