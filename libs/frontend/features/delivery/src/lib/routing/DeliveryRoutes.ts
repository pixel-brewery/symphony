// #region Imports

import type { Routes } from '@angular/router';

// #endregion

export const deliveryRoutes: Routes = [
  {
    path: 'pull-requests',
    loadComponent: () =>
      import('../views/PullRequestsView').then((module) => module.PullRequestsView),
  },
  {
    path: 'delivery',
    pathMatch: 'full',
    redirectTo: 'pull-requests',
  },
];
