// #region Imports

import { InjectionToken } from '@angular/core';
import type { IExecutionProjection } from './IExecutionProjection';

// #endregion

/** Supplies Execution's consumed projection capability. @public */
export const EXECUTION_PROJECTION = new InjectionToken<IExecutionProjection>(
  'EXECUTION_PROJECTION',
);
