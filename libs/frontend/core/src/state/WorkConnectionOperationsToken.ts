// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkConnectionOperations } from './IWorkConnectionOperations';

// #endregion

/** Connects optional Work source operations to their feature-owned implementation. @public */
export const WORK_CONNECTION_OPERATIONS = new InjectionToken<IWorkConnectionOperations>(
  'WORK_CONNECTION_OPERATIONS',
);
