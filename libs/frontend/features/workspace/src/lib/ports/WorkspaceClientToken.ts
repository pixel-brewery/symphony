// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkspaceClient } from './IWorkspaceClient';

// #endregion

/**
 * Supplies Workspace's bounded client dependency.
 *
 * @public
 */
export const WORKSPACE_CLIENT = new InjectionToken<IWorkspaceClient>('WORKSPACE_CLIENT');
