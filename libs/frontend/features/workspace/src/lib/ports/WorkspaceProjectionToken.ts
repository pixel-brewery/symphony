// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkspaceProjection } from './IWorkspaceProjection';

// #endregion

/**
 * Supplies Workspace's bounded projection dependency.
 *
 * @public
 */
export const WORKSPACE_PROJECTION = new InjectionToken<IWorkspaceProjection>(
  'WORKSPACE_PROJECTION',
);
