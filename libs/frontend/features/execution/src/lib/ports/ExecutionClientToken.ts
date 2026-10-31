// #region Imports

import { InjectionToken } from '@angular/core';
import type { IExecutionClient } from './IExecutionClient';

// #endregion

/** Supplies Execution's consumed client capability. @public */
export const EXECUTION_CLIENT = new InjectionToken<IExecutionClient>('EXECUTION_CLIENT');
