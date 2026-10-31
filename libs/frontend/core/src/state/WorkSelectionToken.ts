// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkSelection } from './IWorkSelection';

// #endregion

/**
 * Resolves the single Work operation owner through its consumed contract.
 *
 * @public
 */
export const WORK_SELECTION = new InjectionToken<IWorkSelection>('WORK_SELECTION');
