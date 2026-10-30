// #region Imports

import type { Routes } from '@angular/router';

// #endregion

export const mobileDeliveryRoutes: Routes = [
  {
    path: 'pull-requests',
    loadComponent: () =>
      import('./MobileMergeRequestsView').then((module) => module.MobileMergeRequestsView),
  },
  { path: 'merge-requests', pathMatch: 'full', redirectTo: 'pull-requests' },
];
