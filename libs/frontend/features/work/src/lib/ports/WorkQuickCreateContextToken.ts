// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkQuickCreateContext } from './IWorkQuickCreateContext';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_QUICK_CREATE_CONTEXT = new InjectionToken<IWorkQuickCreateContext>(
  'WORK_QUICK_CREATE_CONTEXT',
);
