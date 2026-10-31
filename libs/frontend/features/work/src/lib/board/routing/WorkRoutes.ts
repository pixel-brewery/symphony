// #region Imports

import type { Routes } from '@angular/router';
import { workOnboardingRoutes } from '../../onboarding/routing/WorkOnboardingRoutes';

// #endregion

/**
 * Lazy desktop routes owned by Work, preserving Board bookmarks.
 *
 * `board/:workItemId` is the work-item screen; the id is one URL-encoded segment, so a
 * provider id with slashes or `#` still resolves to one item and survives back and forward.
 *
 * @public
 */
export const workRoutes: Routes = [
  ...workOnboardingRoutes,
  { path: 'stages', pathMatch: 'full', redirectTo: 'board' },
  {
    path: 'board',
    loadComponent: () => import('../views/BoardView').then((module) => module.BoardView),
  },
  {
    path: 'board/:workItemId',
    loadComponent: () => import('../views/WorkItemView').then((module) => module.WorkItemView),
  },
];
