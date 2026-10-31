// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkspaceContext } from './IWorkspaceContext';

// #endregion

/**
 * Supplies Workspace's bounded context dependency.
 *
 * @public
 */
export const WORKSPACE_CONTEXT = new InjectionToken<IWorkspaceContext>('WORKSPACE_CONTEXT');
