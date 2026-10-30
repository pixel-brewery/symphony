// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkspacePathSelector } from './IWorkspacePathSelector';

// #endregion

/**
 * Consumed desktop path picker, supplied by product composition.
 *
 * @public
 */
export const WORKSPACE_PATH_SELECTOR = new InjectionToken<IWorkspacePathSelector>(
  'WorkspacePathSelector',
);
