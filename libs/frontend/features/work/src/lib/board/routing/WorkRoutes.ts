// #region Imports

import type { Routes } from '@angular/router';
import { workOnboardingRoutes } from '../../onboarding/routing/WorkOnboardingRoutes';

// #endregion

/**
 * Lazy desktop routes owned by Work, preserving Board bookmarks.
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
];
