// #region Imports

import { InjectionToken } from '@angular/core';
import type { IExecutionPublication } from './IExecutionPublication';

// #endregion

/** Supplies Execution's consumed publication capability. @public */
export const EXECUTION_PUBLICATION = new InjectionToken<IExecutionPublication>(
  'EXECUTION_PUBLICATION',
);
