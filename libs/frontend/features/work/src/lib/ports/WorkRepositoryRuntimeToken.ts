// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkRepositoryRuntime } from './IWorkRepositoryRuntime';

// #endregion

/** Connects this Work consumer to its actual bounded participant. @public */
export const WORK_REPOSITORY_RUNTIME = new InjectionToken<IWorkRepositoryRuntime | null>(
  'WORK_REPOSITORY_RUNTIME',
);
