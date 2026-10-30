// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkspaceScope } from './IWorkspaceScope';

// #endregion

/**
 * Resolves feature-owned workspace operations without a Core-to-feature import.
 *
 * @public
 */
export const WORKSPACE_SCOPE = new InjectionToken<IWorkspaceScope>('WORKSPACE_SCOPE');
