// #region Imports

import type { Routes } from '@angular/router';

// #endregion

/**
 * Work-owned setup route preserving the existing project onboarding bookmark.
 *
 * @public
 */
export const workOnboardingRoutes: Routes = [
  {
    path: 'setup',
    loadComponent: () => import('../views/SetupView').then((module) => module.SetupView),
  },
];
