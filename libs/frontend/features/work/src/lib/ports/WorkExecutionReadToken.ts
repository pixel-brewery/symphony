// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkExecutionRead } from './IWorkExecutionRead';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_EXECUTION_READ = new InjectionToken<IWorkExecutionRead | null>(
  'WORK_EXECUTION_READ',
);
