// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkProjection } from './IWorkProjection';

// #endregion

/**
 * Supplies Work's bounded projection dependency.
 *
 * @public
 */
export const WORK_PROJECTION = new InjectionToken<IWorkProjection>('WORK_PROJECTION');
