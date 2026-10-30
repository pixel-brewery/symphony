// #region Imports

import { InjectionToken } from '@angular/core';
import type { IExecutionContext } from './IExecutionContext';

// #endregion

/** Supplies Execution's consumed context capability. @public */
export const EXECUTION_CONTEXT = new InjectionToken<IExecutionContext>('EXECUTION_CONTEXT');
