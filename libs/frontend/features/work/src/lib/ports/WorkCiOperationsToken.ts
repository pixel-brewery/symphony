// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkCiOperations } from './IWorkCiOperations';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_CI_OPERATIONS = new InjectionToken<IWorkCiOperations | null>(
  'WORK_CI_OPERATIONS',
);
