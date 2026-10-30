// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkspaceRefresh } from './IWorkspaceRefresh';

// #endregion

/**
 * Supplies Workspace's bounded refresh dependency.
 *
 * @public
 */
export const WORKSPACE_REFRESH = new InjectionToken<IWorkspaceRefresh>('WORKSPACE_REFRESH');
