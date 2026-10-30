// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkTaskContext } from './IWorkTaskContext';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_TASK_CONTEXT = new InjectionToken<IWorkTaskContext>('WORK_TASK_CONTEXT');
