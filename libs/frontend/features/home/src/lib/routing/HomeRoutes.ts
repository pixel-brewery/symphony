// #region Imports

import type { Routes } from '@angular/router';

// #endregion

export const homeRoutes: Routes = [
  {
    path: 'orbit',
    loadComponent: () => import('../views/OrbitView').then((module) => module.OrbitView),
  },
  {
    path: 'home',
    loadComponent: () => import('../views/HomeView').then((module) => module.HomeView),
  },
  // Preserve existing bookmarks without keeping a second feature identity.
  { path: 'dashboard', pathMatch: 'full', redirectTo: 'home' },
];
