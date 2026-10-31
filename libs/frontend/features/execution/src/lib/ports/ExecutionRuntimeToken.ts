// #region Imports

import { InjectionToken } from '@angular/core';
import type { IExecutionRuntime } from './IExecutionRuntime';

// #endregion

/** Supplies Execution's consumed runtime capability. @public */
export const EXECUTION_RUNTIME = new InjectionToken<IExecutionRuntime>('EXECUTION_RUNTIME');
