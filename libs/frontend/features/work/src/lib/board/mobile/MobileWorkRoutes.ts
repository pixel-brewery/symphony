// #region Imports

import type { Routes } from '@angular/router';

// #endregion

/**
 * Mobile routes owned by Work, preserving the existing navigation paths.
 *
 * @public
 */
export const mobileWorkRoutes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./MobileHomeView').then((module) => module.MobileHomeView),
  },
  {
    path: 'board',
    loadComponent: () => import('./MobileBoardView').then((module) => module.MobileBoardView),
  },
  {
    path: 'tickets',
    loadComponent: () => import('./MobileTicketsView').then((module) => module.MobileTicketsView),
  },
  {
    path: 'tickets/new',
    loadComponent: () =>
      import('./MobileWorkItemCreateView').then((module) => module.MobileWorkItemCreateView),
  },
  {
    path: 'tickets/:ticketId',
    loadComponent: () =>
      import('./MobileTicketDetailView').then((module) => module.MobileTicketDetailView),
  },
];
