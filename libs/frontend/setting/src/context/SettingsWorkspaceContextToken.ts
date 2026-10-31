// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISettingsWorkspaceContext } from './ISettingsWorkspaceContext';

// #endregion

/**
 * Resolves the Settings host selection for independently owned cards and editor commands.
 *
 * @public
 */
export const SETTINGS_WORKSPACE_CONTEXT = new InjectionToken<ISettingsWorkspaceContext>(
  'SETTINGS_WORKSPACE_CONTEXT',
);
