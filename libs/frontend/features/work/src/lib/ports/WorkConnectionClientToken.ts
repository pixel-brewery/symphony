// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkConnectionClient } from './IWorkConnectionClient';

// #endregion

/** Supplies the existing WorkConnectionClient capability to Work. @public */
export const WORK_CONNECTION_CLIENT = new InjectionToken<IWorkConnectionClient>(
  'WORK_CONNECTION_CLIENT',
);
