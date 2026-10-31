// #region Imports

import { InjectionToken } from '@angular/core';
import type { IRepositoryRuntimeOperations } from './IRepositoryRuntimeOperations';

// #endregion

/**
 * Supplies Workspace's sole repository preparation and verification owner.
 *
 * @public
 */
export const REPOSITORY_RUNTIME_OPERATIONS = new InjectionToken<IRepositoryRuntimeOperations>(
  'REPOSITORY_RUNTIME_OPERATIONS',
);
