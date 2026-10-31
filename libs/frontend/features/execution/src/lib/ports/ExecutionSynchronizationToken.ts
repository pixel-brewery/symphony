// #region Imports

import { InjectionToken } from '@angular/core';
import type { IExecutionSynchronization } from './IExecutionSynchronization';

// #endregion

/** Supplies Execution's consumed synchronization capability. @public */
export const EXECUTION_SYNCHRONIZATION = new InjectionToken<IExecutionSynchronization>(
  'EXECUTION_SYNCHRONIZATION',
);
