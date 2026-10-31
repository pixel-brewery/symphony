// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkContext } from './IWorkContext';

// #endregion

/**
 * Supplies Work's bounded context dependency.
 *
 * @public
 */
export const WORK_CONTEXT = new InjectionToken<IWorkContext>('WORK_CONTEXT');
