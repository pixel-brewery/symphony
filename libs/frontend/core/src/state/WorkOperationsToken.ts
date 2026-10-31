// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkOperations } from './IWorkOperations';

// #endregion

/**
 * Resolves the single Work operation owner through its consumed contract.
 *
 * @public
 */
export const WORK_OPERATIONS = new InjectionToken<IWorkOperations>('WORK_OPERATIONS');
