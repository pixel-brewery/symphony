// #region Imports

import type { Routes } from '@angular/router';

// #endregion

export const mobilePresentationRoutes: Routes = [
  {
    path: 'processes',
    loadComponent: () =>
      import('../views/MobileProcessesView').then((module) => module.MobileProcessesView),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('../views/MobileConnectionView').then((module) => module.MobileConnectionView),
  },
  { path: 'connection', pathMatch: 'full', redirectTo: 'settings' },
];
