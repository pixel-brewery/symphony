// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkClient } from './IWorkClient';

// #endregion

/**
 * Supplies Work's bounded client dependency.
 *
 * @public
 */
export const WORK_CLIENT = new InjectionToken<IWorkClient>('WORK_CLIENT');
