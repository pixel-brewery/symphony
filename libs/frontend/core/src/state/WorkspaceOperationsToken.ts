// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkspaceOperations } from './IWorkspaceOperations';

// #endregion

/**
 * Resolves feature-owned workspace operations without a Core-to-feature import.
 *
 * @public
 */
export const WORKSPACE_OPERATIONS = new InjectionToken<IWorkspaceOperations>(
  'WORKSPACE_OPERATIONS',
);
