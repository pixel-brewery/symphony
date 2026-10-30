// #region Imports

import { InjectionToken } from '@angular/core';
import type { IExecutionRefresh } from './IExecutionRefresh';

// #endregion

/** Supplies Execution's consumed refresh capability. @public */
export const EXECUTION_REFRESH = new InjectionToken<IExecutionRefresh>('EXECUTION_REFRESH');
