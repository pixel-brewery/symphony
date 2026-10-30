// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWorkspaceRefreshParticipant } from './IWorkspaceRefreshParticipant';

// #endregion

/**
 * Collects feature-owned workspace refresh participants without importing their implementations.
 *
 * @public
 */
export const WORKSPACE_REFRESH_PARTICIPANTS = new InjectionToken<
  readonly IWorkspaceRefreshParticipant[]
>('WORKSPACE_REFRESH_PARTICIPANTS');
