// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkSearchContext } from '../search/IWorkSearchContext';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_SEARCH_CONTEXT = new InjectionToken<IWorkSearchContext>('WORK_SEARCH_CONTEXT');
