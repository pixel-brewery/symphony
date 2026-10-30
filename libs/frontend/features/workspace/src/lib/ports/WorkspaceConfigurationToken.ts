// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkspaceConfiguration } from './IWorkspaceConfiguration';

// #endregion

/**
 * Supplies Workspace's bounded configuration dependency.
 *
 * @public
 */
export const WORKSPACE_CONFIGURATION = new InjectionToken<IWorkspaceConfiguration>(
  'WORKSPACE_CONFIGURATION',
);
