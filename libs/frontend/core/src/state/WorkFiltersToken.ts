// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkFilters } from './IWorkFilters';

// #endregion

/** Available only while the actual Work feature provides its filter owner. @public */
export const WORK_FILTERS = new InjectionToken<IWorkFilters>('WORK_FILTERS');
