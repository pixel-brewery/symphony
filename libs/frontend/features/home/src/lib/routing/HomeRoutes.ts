// #region Imports

import type { Routes } from '@angular/router';

// #endregion

/**
 * Overview is the first route, so the shell opens Symphony on it; Inbox and Orbit follow.
 *
 * @public
 */
export const homeRoutes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('../views/HomeView').then((module) => module.HomeView),
  },
  {
    path: 'inbox',
    loadComponent: () => import('../views/InboxView').then((module) => module.InboxView),
  },
  {
    path: 'orbit',
    loadComponent: () => import('../views/OrbitView').then((module) => module.OrbitView),
  },
  // Preserve existing bookmarks without keeping a second feature identity.
  { path: 'dashboard', pathMatch: 'full', redirectTo: 'home' },
];
