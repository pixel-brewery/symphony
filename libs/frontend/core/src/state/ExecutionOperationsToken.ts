// #region Imports

import { InjectionToken } from '@angular/core';
import type { IExecutionOperations } from './IExecutionOperations';

// #endregion

/** Supplies the feature-owned execution operations capability. @public */
export const EXECUTION_OPERATIONS = new InjectionToken<IExecutionOperations>(
  'EXECUTION_OPERATIONS',
);
