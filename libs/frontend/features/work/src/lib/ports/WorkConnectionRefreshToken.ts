// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkConnectionRefresh } from './IWorkConnectionRefresh';

// #endregion

/** Supplies the existing WorkConnectionRefresh capability to Work. @public */
export const WORK_CONNECTION_REFRESH = new InjectionToken<IWorkConnectionRefresh>(
  'WORK_CONNECTION_REFRESH',
);
