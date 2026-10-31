// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkExecution } from './IWorkExecution';

// #endregion

/**
 * Supplies Work's bounded execution dependency.
 *
 * @public
 */
export const WORK_EXECUTION = new InjectionToken<IWorkExecution>('WORK_EXECUTION');
