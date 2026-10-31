// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkConnectionProjection } from './IWorkConnectionProjection';

// #endregion

/** Supplies the existing WorkConnectionProjection capability to Work. @public */
export const WORK_CONNECTION_PROJECTION = new InjectionToken<IWorkConnectionProjection>(
  'WORK_CONNECTION_PROJECTION',
);
