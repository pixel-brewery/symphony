// #region Imports

import { InjectionToken } from '@angular/core';
import type { IRepositoryRuntimeClient } from './IRepositoryRuntimeClient';

// #endregion

/**
 * Supplies the bounded repository runtime request capability.
 *
 * @public
 */
export const REPOSITORY_RUNTIME_CLIENT = new InjectionToken<IRepositoryRuntimeClient>(
  'REPOSITORY_RUNTIME_CLIENT',
);
