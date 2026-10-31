// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkspaceSettingsContext } from './IWorkspaceSettingsContext';

// #endregion

/**
 * Read-only aggregate adapter used by Workspace-owned Settings surfaces.
 *
 * @public
 */
export const WORKSPACE_SETTINGS_CONTEXT = new InjectionToken<IWorkspaceSettingsContext>(
  'WorkspaceSettingsContext',
);
