// #region Imports

import { InjectionToken } from '@angular/core';
import type { IExecutionActivity } from './IExecutionActivity';

// #endregion

/** Supplies the feature-owned execution activity capability. @public */
export const EXECUTION_ACTIVITY = new InjectionToken<IExecutionActivity>('EXECUTION_ACTIVITY');
